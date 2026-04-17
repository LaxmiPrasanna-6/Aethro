"""
Hospital resource management with advanced features:
- Predictive demand analysis
- Bundle booking (multi-resource)
- Reputation/no-show tracking
- Proximity-aware allocation
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.schemas.resource import HospitalResourceCreate, HospitalResourceFilter
from app.services.allocation_service import get_available_resources, predict_demand
from app.services.docx_parser import (
    parse_docx_hospital_resources,
    generate_hospital_template_docx,
)
from app.utils.dependencies import get_current_user, serialize_doc, serialize_list

router = APIRouter()


def _require_hospital(user):
    if user["org_type"] != "hospital":
        raise HTTPException(403, "Hospital module only")


@router.post("/resources", summary="Add hospital resource (Admin only)")
async def add_resource(data: HospitalResourceCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Only admin can add resources")
    doc = {
        **data.model_dump(),
        "org_id": current_user["org_id"],
        "org_type": "hospital",
        "is_available": True,
        "current_occupancy": 0,
        "created_at": datetime.utcnow(),
    }
    result = await db.resources.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/resources", summary="Get all hospital resources")
async def get_resources(
    resource_type: str = Query(None),
    department: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    query = {"org_id": current_user["org_id"], "org_type": "hospital"}
    if resource_type:
        query["resource_type"] = resource_type
    if department:
        query["department"] = department
    resources = await db.resources.find(query).to_list(500)
    return serialize_list([dict(r) for r in resources])


@router.post("/resources/available", summary="Find available resources by filter")
async def available_resources(filters: HospitalResourceFilter, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    available = await get_available_resources(
        current_user["org_id"], "hospital", filters.model_dump(exclude_none=True), db
    )
    return serialize_list([dict(r) for r in available])


@router.get("/demand-forecast", summary="Predictive demand analysis by resource type")
async def demand_forecast(
    resource_type: str = Query("ward"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    forecast = await predict_demand(str(current_user["org_id"]), resource_type, db)
    return {"resource_type": resource_type, "demand_by_day": forecast}


@router.get("/reputation-report", summary="Staff/doctor reputation scores (Admin only)")
async def reputation_report(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    cursor = db.users.find({"org_id": current_user["org_id"]}).sort("reputation_score", 1)
    users = await cursor.to_list(200)
    return serialize_list([{
        "id": str(u["_id"]),
        "username": u["username"],
        "role": u["role"],
        "reputation_score": u.get("reputation_score", 5.0),
        "no_show_count": u.get("no_show_count", 0),
    } for u in users])


@router.post("/bundle-booking", summary="Multi-resource bundle booking")
async def bundle_booking(
    resource_ids: list[str],
    purpose: str,
    date: str,
    time_start: str,
    time_end: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    from app.services.booking_service import create_booking
    from bson import ObjectId as ObjId

    bundle_id = ObjId()
    bookings = []
    for rid in resource_ids:
        data = {
            "resource_type": None,
            "required_capacity": 1,
            "date": date,
            "time_slot": {"start": time_start, "end": time_end},
            "purpose": purpose,
            "priority": "high",
            "justification": f"Bundle booking {bundle_id}",
            "required_facilities": [],
            "bundle_resources": resource_ids,
        }
        booking = await create_booking(current_user, data, db)
        await db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"bundle_id": bundle_id, "resource_id": ObjId(rid)}})
        bookings.append(booking)
    return {"bundle_id": str(bundle_id), "bookings_created": len(bookings)}


@router.get("/proximity-resources", summary="Proximity-aware resource list (by department)")
async def proximity_resources(
    department: str = Query(...),
    resource_type: str = Query("ward"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    # Proximity: prefer same department, then same floor, then others
    same_dept = await db.resources.find({
        "org_id": current_user["org_id"],
        "org_type": "hospital",
        "resource_type": resource_type,
        "department": department,
        "is_available": True,
    }).to_list(50)
    other = await db.resources.find({
        "org_id": current_user["org_id"],
        "org_type": "hospital",
        "resource_type": resource_type,
        "department": {"$ne": department},
        "is_available": True,
    }).to_list(50)
    return {
        "same_department": serialize_list([dict(r) for r in same_dept]),
        "other_departments": serialize_list([dict(r) for r in other]),
    }


# ── Bulk upload via Word blueprint document ────────────────────────────────

@router.post(
    "/resources/upload-docx",
    summary="Bulk-create hospital resources from a .docx blueprint (Admin only)",
)
async def upload_resources_docx(
    file: UploadFile = File(..., description="Word (.docx) hospital blueprint"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Upload a Word blueprint document describing hospital resources.

    **Expected format** (blank line between entries):

        Room ID: W-101
        Type: Ward
        Department: Cardiology
        Floor: 2
        Capacity: 10
        Facilities: monitors, oxygen, nurse_call

        Room ID: ICU-01
        Type: ICU
        Department: Critical Care
        Floor: 3
        Capacity: 6
        Facilities: ventilator, monitors, defibrillator

    Valid Types: `Ward`, `ICU`, `OT`, `Consultation`, `Bed`
    """
    _require_hospital(current_user)
    if current_user["role"] != "admin":
        raise HTTPException(403, "Only admin can upload resource blueprints")

    filename = file.filename or ""
    if not filename.lower().endswith(".docx"):
        raise HTTPException(400, f"Invalid file type '{filename}'. Only .docx is accepted.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Uploaded file is empty.")

    try:
        parse_result = parse_docx_hospital_resources(file_bytes)
    except Exception as exc:
        raise HTTPException(422, f"Could not read document: {exc}")

    resources_data = parse_result["resources"]
    parse_errors = parse_result["errors"]
    total_blocks = parse_result["total_blocks"]

    if not resources_data and parse_errors:
        raise HTTPException(
            422,
            detail={
                "message": "No valid resource entries found in the document.",
                "parse_errors": parse_errors,
                "total_blocks_found": total_blocks,
                "preview": parse_result.get("raw_preview", []),
            },
        )

    existing_ids = {
        r["room_id"]
        for r in await db.resources.find(
            {"org_id": current_user["org_id"], "org_type": "hospital"},
            {"room_id": 1},
        ).to_list(5000)
    }

    now = datetime.utcnow()
    to_insert = []
    skipped = []

    for res in resources_data:
        if res["room_id"] in existing_ids:
            skipped.append({"room_id": res["room_id"], "reason": "Room ID already exists"})
            continue
        to_insert.append({
            **res,
            "org_id": current_user["org_id"],
            "org_type": "hospital",
            "is_available": True,
            "current_occupancy": 0,
            "created_at": now,
        })

    inserted_ids = []
    if to_insert:
        result = await db.resources.insert_many(to_insert)
        inserted_ids = [str(oid) for oid in result.inserted_ids]

    return {
        "message": f"Blueprint uploaded. {len(inserted_ids)} resource(s) created.",
        "total_blocks_found": total_blocks,
        "created": len(inserted_ids),
        "skipped": len(skipped),
        "parse_errors": len(parse_errors),
        "skipped_details": skipped,
        "parse_error_details": parse_errors,
        "raw_preview": parse_result.get("raw_preview", []),
        "created_ids": inserted_ids,
    }


@router.get(
    "/resources/docx-template",
    summary="Download a ready-to-use .docx hospital blueprint template",
)
async def download_hospital_template(current_user=Depends(get_current_user)):
    _require_hospital(current_user)
    docx_bytes = generate_hospital_template_docx()
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": "attachment; filename=hospital_blueprint_template.docx"
        },
    )
