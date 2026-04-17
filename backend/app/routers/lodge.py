from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.schemas.resource import LodgeRoomCreate, LodgeRoomFilter
from app.services.allocation_service import get_available_resources
from app.services.docx_parser import parse_docx_hostel_lodge_rooms, generate_lodge_template_docx
from app.utils.dependencies import get_current_user, serialize_doc, serialize_list

router = APIRouter()


def _require_lodge(user):
    if user["org_type"] != "lodge":
        raise HTTPException(403, "Lodge module only")


@router.post("/rooms", summary="Add lodge room (Manager only)")
async def add_room(data: LodgeRoomCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_lodge(current_user)
    if current_user["role"] != "manager":
        raise HTTPException(403, "Only manager can add rooms")
    doc = {
        **data.model_dump(),
        "org_id": current_user["org_id"],
        "org_type": "lodge",
        "resource_type": "room",
        "is_available": True,
        "current_occupancy": 0,
        "created_at": datetime.utcnow(),
    }
    result = await db.resources.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/rooms", summary="Get all lodge rooms")
async def get_rooms(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_lodge(current_user)
    rooms = await db.resources.find({"org_id": current_user["org_id"], "org_type": "lodge"}).to_list(200)
    return serialize_list([dict(r) for r in rooms])


@router.post("/rooms/filter", summary="Filter available rooms (AC/Non-AC, sharing, food)")
async def filter_rooms(filters: LodgeRoomFilter, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_lodge(current_user)
    available = await get_available_resources(
        current_user["org_id"], "lodge", filters.model_dump(exclude_none=True), db
    )
    return serialize_list([dict(r) for r in available])


@router.patch("/rooms/{room_id}/allocate", summary="Allocate room to a guest")
async def allocate_room(room_id: str, guest_count: int = 1, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_lodge(current_user)
    if current_user["role"] != "manager":
        raise HTTPException(403, "Only manager can allocate rooms")
    room = await db.resources.find_one({"_id": ObjectId(room_id), "org_id": current_user["org_id"]})
    if not room:
        raise HTTPException(404, "Room not found")
    if not room["is_available"]:
        raise HTTPException(400, "Room not available")
    new_occ = room["current_occupancy"] + guest_count
    if new_occ > room.get("sharing_type", room["capacity"]):
        raise HTTPException(400, "Exceeds sharing capacity")
    is_available = new_occ < room.get("sharing_type", room["capacity"])
    result = await db.resources.find_one_and_update(
        {"_id": ObjectId(room_id)},
        {"$set": {"current_occupancy": new_occ, "is_available": is_available}},
        return_document=True,
    )
    return serialize_doc(dict(result))


@router.patch("/rooms/{room_id}/release", summary="Release lodge room")
async def release_room(room_id: str, guests: int = 1, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_lodge(current_user)
    if current_user["role"] != "manager":
        raise HTTPException(403, "Only manager can release rooms")
    room = await db.resources.find_one({"_id": ObjectId(room_id), "org_id": current_user["org_id"]})
    if not room:
        raise HTTPException(404, "Room not found")
    new_occ = max(0, room["current_occupancy"] - guests)
    result = await db.resources.find_one_and_update(
        {"_id": ObjectId(room_id)},
        {"$set": {"current_occupancy": new_occ, "is_available": True}},
        return_document=True,
    )
    return serialize_doc(dict(result))


@router.get("/availability-summary", summary="Lodge availability summary")
async def availability_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_lodge(current_user)
    rooms = await db.resources.find({"org_id": current_user["org_id"], "org_type": "lodge"}).to_list(200)
    return {
        "total_rooms": len(rooms),
        "available_rooms": sum(1 for r in rooms if r["is_available"]),
        "occupied_rooms": sum(1 for r in rooms if not r["is_available"]),
        "ac_rooms": sum(1 for r in rooms if r.get("room_type") == "ac"),
        "non_ac_rooms": sum(1 for r in rooms if r.get("room_type") == "non_ac"),
        "with_food": sum(1 for r in rooms if r.get("food_option")),
    }


# ── Bulk upload via Word document ──────────────────────────────────────────

@router.post(
    "/rooms/upload-docx",
    summary="Bulk-create lodge rooms from .docx file (Manager only)",
    response_description="Summary of created, skipped, and failed room entries",
)
async def upload_rooms_docx(
    file: UploadFile = File(..., description="Word (.docx) file with lodge rooms"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Upload a Word document (.docx) to bulk-create lodge rooms.

    ⚠️ **LODGE FORMAT** (similar to hostel but with optional AC/food options):
    NO blank lines needed between rooms - just consecutive entries:

        Room ID: L-101
        Floor: 1
        Beds: 1
        Room Type: AC
        Sharing Type: 1
        Food Option: Yes
        Features: WiFi, TV, Attached Bath
        Room ID: L-102
        Floor: 1
        Beds: 2
        Room Type: Non-AC
        Sharing Type: 2
        Food Option: No
        Features: WiFi, Shared Bath

    **Required Fields:**
    - Room ID: Unique identifier (e.g., L-101, A101)
    - Floor: Floor number (integer: 0, 1, 2, ...)
    - Beds: Number of beds per room (integer, > 0)
    
    **Optional Fields:**
    - Room Type: AC or Non-AC
    - Sharing Type: 1, 2, 3, 4 (number of guests per room)
    - Food Option: Yes/No or True/False  
    - Features: Comma-separated amenities (WiFi, TV, Kitchen, etc.)
    """
    _require_lodge(current_user)
    if current_user["role"] != "manager":
        raise HTTPException(403, "Only manager can upload room data")

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
        parse_result = parse_docx_hostel_lodge_rooms(file_bytes)
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
            {"org_id": current_user["org_id"], "org_type": "lodge"},
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
            "room_id":           room["room_id"],
            "floor":             room["floor"],
            "capacity":          room["capacity"],
            "features":          room["features"],
            "org_id":            current_user["org_id"],
            "org_type":          "lodge",
            "resource_type":     "room",
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
    summary="Download a ready-to-use .docx lodge room upload template",
)
async def download_template(current_user=Depends(get_current_user)):
    _require_lodge(current_user)
    docx_bytes = generate_lodge_template_docx()
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=lodge_room_upload_template.docx"},
    )


@router.get("/rooms/empty", summary="Get all empty rooms (no occupants)")
async def get_empty_rooms(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get list of all rooms with no occupants, grouped by floor."""
    _require_lodge(current_user)
    rooms = await db.resources.find(
        {"org_id": current_user["org_id"], "org_type": "lodge", "current_occupancy": 0}
    ).to_list(500)
    
    # Group by floor
    by_floor = {}
    for room in rooms:
        floor = room.get("floor", "Unknown")
        if floor not in by_floor:
            by_floor[floor] = []
        by_floor[floor].append(serialize_doc(dict(room)))
    
    return {
        "total_empty_rooms": len(rooms),
        "by_floor": by_floor,
        "rooms": serialize_list([dict(r) for r in rooms])
    }
