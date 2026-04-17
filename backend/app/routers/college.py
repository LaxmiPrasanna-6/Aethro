"""
College-specific resource management.
Admin: full CRUD over rooms, approval control.
Staff: view rooms.
Student: view available rooms (cannot manage).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.schemas.resource import CollegeRoomCreate, CollegeRoomFilter
from app.services.allocation_service import get_available_resources
from app.services.docx_parser import parse_docx_rooms, generate_template_docx
from app.utils.dependencies import get_current_user, serialize_doc, serialize_list

router = APIRouter()


def _require_college(user):
    if user["org_type"] != "college":
        raise HTTPException(403, "College module only")


@router.post("/rooms", summary="Add a room/lab/hall (Admin only)")
async def add_room(data: CollegeRoomCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Only admin can add rooms")
    doc = {
        **data.model_dump(),
        "org_id": current_user["org_id"],
        "org_type": "college",
        "is_available": True,
        "current_occupancy": 0,
        "created_at": datetime.utcnow(),
    }
    result = await db.resources.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/rooms", summary="Get all rooms for the college")
async def get_rooms(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    rooms = await db.resources.find({"org_id": current_user["org_id"], "org_type": "college"}).to_list(500)
    return serialize_list([dict(r) for r in rooms])


@router.post("/rooms/available", summary="Filter available rooms by criteria")
async def available_rooms(filters: CollegeRoomFilter, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    available = await get_available_resources(
        current_user["org_id"], "college", filters.model_dump(exclude_none=True), db
    )
    return serialize_list([dict(r) for r in available])


@router.patch("/rooms/{room_id}", summary="Update room details (Admin only)")
async def update_room(room_id: str, data: dict, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Only admin can update rooms")
    result = await db.resources.find_one_and_update(
        {"_id": ObjectId(room_id), "org_id": current_user["org_id"]},
        {"$set": data},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Room not found")
    return serialize_doc(dict(result))


@router.delete("/rooms/{room_id}", summary="Delete a room (Admin only)")
async def delete_room(room_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Only admin can delete rooms")
    result = await db.resources.delete_one({"_id": ObjectId(room_id), "org_id": current_user["org_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Room not found")
    return {"message": "Room deleted"}


@router.get("/blueprint", summary="College blueprint (all blocks and rooms)")
async def college_blueprint(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    cursor = db.resources.find({"org_id": current_user["org_id"], "org_type": "college"})
    rooms = await cursor.to_list(500)
    # Group by block
    blueprint = {}
    for r in rooms:
        block = r.get("block", "General")
        if block not in blueprint:
            blueprint[block] = []
        blueprint[block].append(serialize_doc(dict(r)))
    return blueprint


@router.get("/departments", summary="Get all departments in the college")
async def get_departments(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college(current_user)
    cursor = db.users.find({"org_id": current_user["org_id"], "role": "staff"})
    users = await cursor.to_list(200)
    depts = list({u.get("department") for u in users if u.get("department")})
    return {"departments": depts}


# ── Bulk upload via Word document ──────────────────────────────────────────

@router.post(
    "/rooms/upload-docx",
    summary="Bulk-create rooms from a .docx file (Admin only)",
    response_description="Summary of created, skipped, and failed room entries",
)
async def upload_rooms_docx(
    file: UploadFile = File(..., description="Word (.docx) file containing room data"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Upload a Word document (.docx) to bulk-create rooms.

    **Document format** (each room separated by a blank line):

        Block: A
        Room ID: A-101
        Type: Classroom
        Capacity: 30
        Facilities: projector, ac, whiteboard

    Valid Type values: `Classroom`, `Lab`, `Seminar Hall`
    """
    _require_college(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Only admin can upload room data")

    # ── Validate file extension ───────────────────────────────────────────
    filename = file.filename or ""
    if not filename.lower().endswith(".docx"):
        raise HTTPException(
            400,
            detail=f"Invalid file type '{filename}'. Only .docx files are accepted.",
        )

    # ── Read file bytes ───────────────────────────────────────────────────
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, detail="Uploaded file is empty.")

    # ── Parse the document ────────────────────────────────────────────────
    try:
        parse_result = parse_docx_rooms(file_bytes)
    except Exception as exc:
        raise HTTPException(422, detail=f"Could not read document: {exc}")

    rooms_data  = parse_result["rooms"]
    parse_errors = parse_result["errors"]
    total_blocks = parse_result["total_blocks"]

    if not rooms_data and parse_errors:
        raise HTTPException(
            422,
            detail={
                "message": "No valid room entries found in the document.",
                "parse_errors": parse_errors,
                "total_blocks_found": total_blocks,
            },
        )

    # ── Deduplicate against existing rooms in this org ────────────────────
    existing_ids = {
        r["room_id"]
        for r in await db.resources.find(
            {"org_id": current_user["org_id"], "org_type": "college"},
            {"room_id": 1},
        ).to_list(5000)
    }

    now = datetime.utcnow()
    to_insert   = []
    skipped     = []

    for room in rooms_data:
        if room["room_id"] in existing_ids:
            skipped.append(
                {"room_id": room["room_id"], "reason": "Room ID already exists"}
            )
            continue

        to_insert.append({
            "block":             room["block"],
            "room_id":           room["room_id"],
            "resource_type":     room["resource_type"],
            "capacity":          room["capacity"],
            "facilities":        room["facilities"],
            "org_id":            current_user["org_id"],
            "org_type":          "college",
            "is_available":      True,
            "current_occupancy": 0,
            "created_at":        now,
        })

    # ── Insert valid new rooms ────────────────────────────────────────────
    inserted_ids = []
    if to_insert:
        result = await db.resources.insert_many(to_insert)
        inserted_ids = [str(oid) for oid in result.inserted_ids]

    return {
        "message":             f"Upload complete. {len(inserted_ids)} room(s) created.",
        "total_blocks_found":  total_blocks,
        "created":             len(inserted_ids),
        "skipped":             len(skipped),
        "parse_errors":        len(parse_errors),
        "skipped_details":     skipped,
        "parse_error_details": parse_errors,
        "raw_preview":         parse_result.get("raw_preview", []),
        "created_ids":         inserted_ids,
    }


@router.get(
    "/rooms/docx-template",
    summary="Download a ready-to-use .docx room upload template",
)
async def download_template(current_user=Depends(get_current_user)):
    _require_college(current_user)
    docx_bytes = generate_template_docx()
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=room_upload_template.docx"},
    )


@router.post(
    "/rooms/preview-docx",
    summary="Debug: preview what lines were extracted from a .docx file",
)
async def preview_docx(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    _require_college(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    if not (file.filename or "").lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files accepted")

    file_bytes = await file.read()
    try:
        result = parse_docx_rooms(file_bytes)
    except Exception as exc:
        raise HTTPException(422, f"Could not read document: {exc}")

    return {
        "total_blocks_found": result["total_blocks"],
        "valid_rooms_parsed": len(result["rooms"]),
        "parse_errors":       result["errors"],
        "raw_lines_preview":  result.get("raw_preview", []),
        "parsed_rooms":       result["rooms"],
    }
