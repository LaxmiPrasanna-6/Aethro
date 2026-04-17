from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.schemas.exam import ExamSessionCreate, StudentCreate, StudentsBulkCreate, SeatingAllocationRequest
from app.services.exam_service import run_seating_allocation, get_seating_by_session
from app.services.docx_parser import parse_docx_students, generate_student_template_docx
from app.utils.dependencies import get_current_user, serialize_doc, serialize_list

router = APIRouter()


def _require_college_admin(user):
    if user["org_type"] != "college" or user["role"] != "admin":
        raise HTTPException(403, "College admin only")


@router.post("/sessions", summary="Create an exam session")
async def create_session(data: ExamSessionCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college_admin(current_user)
    doc = {
        **data.model_dump(),
        "org_id": current_user["org_id"],
        "status": "pending",
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
    }
    result = await db.exam_sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/sessions", summary="List all exam sessions")
async def list_sessions(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["org_type"] != "college":
        raise HTTPException(403, "College only")
    cursor = db.exam_sessions.find({"org_id": current_user["org_id"]}).sort("date", -1)
    sessions = await cursor.to_list(100)
    return serialize_list([dict(s) for s in sessions])


@router.get("/sessions/{session_id}", summary="Get exam session with seating")
async def get_session(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["org_type"] != "college":
        raise HTTPException(403, "College only")
    session = await db.exam_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(404, "Session not found")
    seating = await get_seating_by_session(session_id, db)
    result = serialize_doc(dict(session))
    result["rooms"] = serialize_list([dict(s) for s in seating])
    return result


@router.post("/sessions/{session_id}/allocate", summary="Run seating allocation algorithm")
async def allocate(
    session_id: str,
    data: SeatingAllocationRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_college_admin(current_user)
    seating = await run_seating_allocation(session_id, data.room_ids or [], db)
    return {"message": "Seating allocated", "rooms_allocated": len(seating)}


@router.get(
    "/students/docx-template",
    summary="Download a ready-to-use .docx student upload template",
)
async def download_student_template(current_user=Depends(get_current_user)):
    _require_college_admin(current_user)
    docx_bytes = generate_student_template_docx()
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=student_upload_template.docx"},
    )


@router.post(
    "/students/preview-docx",
    summary="Preview student entries extracted from a .docx file",
)
async def preview_student_docx(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    _require_college_admin(current_user)
    if not (file.filename or "").lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files accepted")

    file_bytes = await file.read()
    try:
        result = parse_docx_students(file_bytes)
    except Exception as exc:
        raise HTTPException(422, f"Could not read document: {exc}")

    return {
        "total_blocks_found": result["total_blocks"],
        "valid_students_parsed": len(result["students"]),
        "parse_errors": result["errors"],
        "raw_lines_preview": result.get("raw_preview", []),
        "parsed_students": result["students"],
    }


@router.post(
    "/students/upload-docx",
    summary="Bulk register students from a .docx file",
)
async def upload_students_docx(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _require_college_admin(current_user)
    filename = file.filename or ""
    if not filename.lower().endswith(".docx"):
        raise HTTPException(400, detail=f"Invalid file type '{filename}'. Only .docx files are accepted.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, detail="Uploaded file is empty.")

    try:
        parse_result = parse_docx_students(file_bytes)
    except Exception as exc:
        raise HTTPException(422, detail=f"Could not read document: {exc}")

    students_data = parse_result["students"]
    parse_errors = parse_result["errors"]
    total_blocks = parse_result["total_blocks"]

    if not students_data and parse_errors:
        raise HTTPException(
            422,
            detail={
                "message": "No valid student entries found in the document.",
                "parse_errors": parse_errors,
                "total_blocks_found": total_blocks,
            },
        )

    existing_ids = {
        s["student_id"]
        for s in await db.students.find(
            {"org_id": current_user["org_id"]},
            {"student_id": 1},
        ).to_list(5000)
    }

    to_insert = []
    skipped = []
    for student in students_data:
        if student["student_id"] in existing_ids:
            skipped.append({"student_id": student["student_id"], "reason": "Student already registered"})
            continue
        existing_ids.add(student["student_id"])
        to_insert.append({"org_id": current_user["org_id"], **student})

    inserted_ids = []
    if to_insert:
        result = await db.students.insert_many(to_insert)
        inserted_ids = [str(oid) for oid in result.inserted_ids]

    return {
        "message": f"Upload complete. {len(inserted_ids)} student(s) registered.",
        "total_blocks_found": total_blocks,
        "created": len(inserted_ids),
        "skipped": len(skipped),
        "parse_errors": len(parse_errors),
        "skipped_details": skipped,
        "parse_error_details": parse_errors,
        "raw_preview": parse_result.get("raw_preview", []),
        "created_ids": inserted_ids,
    }


@router.post("/students", summary="Register a student for exam")
async def register_student(data: StudentCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college_admin(current_user)
    doc = {**data.model_dump(), "org_id": current_user["org_id"]}
    if await db.students.find_one({"org_id": current_user["org_id"], "student_id": data.student_id}):
        raise HTTPException(409, "Student already registered")
    result = await db.students.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.post("/students/bulk", summary="Bulk register students")
async def bulk_register(data: StudentsBulkCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college_admin(current_user)
    docs = [{"org_id": current_user["org_id"], **s.model_dump()} for s in data.students]
    if docs:
        await db.students.insert_many(docs, ordered=False)
    return {"message": f"{len(docs)} students registered"}


@router.get("/students", summary="List all students")
async def list_students(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["org_type"] != "college":
        raise HTTPException(403, "College only")
    cursor = db.students.find({"org_id": current_user["org_id"]})
    students = await cursor.to_list(5000)
    return serialize_list([dict(s) for s in students])


@router.delete("/sessions/{session_id}/seating", summary="Reset seating for a session")
async def reset_seating(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_college_admin(current_user)
    await db.exam_seating.delete_many({"session_id": ObjectId(session_id)})
    await db.exam_sessions.update_one({"_id": ObjectId(session_id)}, {"$set": {"status": "pending"}})
    return {"message": "Seating reset"}
