"""
Hospital resource management with advanced features:
- Predictive demand analysis
- Bundle booking (multi-resource)
- Reputation/no-show tracking
- Proximity-aware allocation
- Patient registration and doctor assignment
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.schemas.resource import HospitalResourceCreate, HospitalResourceFilter
from app.schemas.patient import PatientCreate, PatientUpdate
from app.services.allocation_service import get_available_resources, predict_demand
from app.services.symptom_service import suggest_specialization, find_available_doctors
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


# ── Patient endpoints ─────────────────────────────────────────────────────────

def _serialize_patient(p: dict) -> dict:
    p = dict(p)
    p["id"] = str(p.pop("_id"))
    p["org_id"] = str(p.get("org_id", ""))
    p["registered_by"] = str(p.get("registered_by", ""))
    if p.get("assigned_doctor_id"):
        p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
    if p.get("assigned_resource_id"):
        p["assigned_resource_id"] = str(p["assigned_resource_id"])
    return p


@router.post("/patients", summary="Register a new patient (Reception only)")
async def register_patient(data: PatientCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    if current_user["role"] not in ("reception", "admin"):
        raise HTTPException(403, "Only reception or admin can register patients")

    specialization = suggest_specialization(data.symptoms)
    doctors = await find_available_doctors(current_user["org_id"], specialization, db)

    assigned_doctor = doctors[0] if doctors else None

    now = datetime.utcnow()
    doc = {
        "name": data.name,
        "age": data.age,
        "gender": data.gender,
        "contact": data.contact,
        "symptoms": data.symptoms,
        "emergency": data.emergency,
        "notes": data.notes,
        "suggested_specialization": specialization,
        "assigned_doctor_id": assigned_doctor["_id"] if assigned_doctor else None,
        "assigned_doctor_name": assigned_doctor["username"] if assigned_doctor else None,
        "assigned_resource_id": None,
        "assigned_resource_name": None,
        "treatment_notes": None,
        "status": "registered",
        "registered_by": current_user["_id"],
        "org_id": current_user["org_id"],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.patients.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_patient(doc)


@router.get("/patients", summary="List all patients in the organization")
async def list_patients(
    status: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    query = {"org_id": current_user["org_id"]}
    if status:
        query["status"] = status
    # Doctors see only their assigned patients
    if current_user["role"] == "doctor":
        query["assigned_doctor_id"] = current_user["_id"]
    patients = await db.patients.find(query).sort("created_at", -1).to_list(500)
    return [_serialize_patient(p) for p in patients]


@router.get("/patients/{patient_id}", summary="Get patient details")
async def get_patient(patient_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    patient = await db.patients.find_one({"_id": ObjectId(patient_id), "org_id": current_user["org_id"]})
    if not patient:
        raise HTTPException(404, "Patient not found")
    return _serialize_patient(patient)


@router.patch("/patients/{patient_id}", summary="Update patient status or assignment")
async def update_patient(
    patient_id: str,
    data: PatientUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    if current_user["role"] not in ("doctor", "admin", "reception"):
        raise HTTPException(403, "Not authorized")

    patient = await db.patients.find_one({"_id": ObjectId(patient_id), "org_id": current_user["org_id"]})
    if not patient:
        raise HTTPException(404, "Patient not found")

    update: dict = {"updated_at": datetime.utcnow()}
    if data.status is not None:
        update["status"] = data.status
    if data.emergency is not None:
        update["emergency"] = data.emergency
    if data.treatment_notes is not None:
        update["treatment_notes"] = data.treatment_notes
    if data.assigned_doctor_id is not None:
        doctor = await db.users.find_one({"_id": ObjectId(data.assigned_doctor_id), "org_id": current_user["org_id"]})
        if not doctor:
            raise HTTPException(404, "Doctor not found")
        update["assigned_doctor_id"] = doctor["_id"]
        update["assigned_doctor_name"] = doctor["username"]
    if data.assigned_resource_id is not None:
        resource = await db.resources.find_one({"_id": ObjectId(data.assigned_resource_id), "org_id": current_user["org_id"]})
        if not resource:
            raise HTTPException(404, "Resource not found")
        update["assigned_resource_id"] = resource["_id"]
        update["assigned_resource_name"] = resource.get("room_id")

    await db.patients.update_one({"_id": ObjectId(patient_id)}, {"$set": update})
    updated = await db.patients.find_one({"_id": ObjectId(patient_id)})
    return _serialize_patient(updated)


# ── Doctor availability endpoints ─────────────────────────────────────────────

@router.get("/doctors", summary="List doctors with availability status")
async def list_doctors(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    doctors = await db.users.find({
        "org_id": current_user["org_id"],
        "role": "doctor",
        "is_authorized": True,
    }).to_list(200)
    return serialize_list([{
        "id": str(d["_id"]),
        "username": d["username"],
        "specialization": d.get("specialization") or "general medicine",
        "availability_status": d.get("availability_status") or "available",
        "reputation_score": d.get("reputation_score", 5.0),
        "department": d.get("department"),
    } for d in doctors])


@router.post("/doctors/suggest", summary="Suggest doctor based on symptoms")
async def suggest_doctor(
    symptoms: list[str],
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    specialization = suggest_specialization(symptoms)
    doctors = await find_available_doctors(current_user["org_id"], specialization, db)
    return {
        "suggested_specialization": specialization,
        "doctors": serialize_list([{
            "id": str(d["_id"]),
            "username": d["username"],
            "specialization": d.get("specialization") or "general medicine",
            "availability_status": d.get("availability_status") or "available",
            "reputation_score": d.get("reputation_score", 5.0),
        } for d in doctors[:5]]),
    }


@router.patch("/doctors/availability", summary="Update own availability status (Doctor only)")
async def update_availability(
    status: str = Query(..., description="available | busy | off_duty"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_hospital(current_user)
    if current_user["role"] != "doctor":
        raise HTTPException(403, "Only doctors can update availability status")
    allowed = {"available", "busy", "off_duty"}
    if status not in allowed:
        raise HTTPException(400, f"Status must be one of: {', '.join(allowed)}")
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"availability_status": status}})
    return {"availability_status": status}


@router.get("/availability", summary="Real-time availability summary (rooms, ICU, labs)")
async def availability_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_hospital(current_user)
    org_id = current_user["org_id"]
    resources = await db.resources.find({"org_id": org_id, "org_type": "hospital"}).to_list(1000)

    summary: dict = {}
    for r in resources:
        rtype = r.get("resource_type", "other")
        if rtype not in summary:
            summary[rtype] = {"total": 0, "available": 0, "occupied": 0, "items": []}
        summary[rtype]["total"] += 1
        is_avail = r.get("is_available", True) and r.get("current_occupancy", 0) < r.get("capacity", 1)
        if is_avail:
            summary[rtype]["available"] += 1
        else:
            summary[rtype]["occupied"] += 1
        summary[rtype]["items"].append(serialize_doc(dict(r)))

    return summary
