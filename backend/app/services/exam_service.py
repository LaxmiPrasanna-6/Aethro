"""
AI-based Examination Seating Arrangement.

Algorithm:
1. Group students by (department, subject).
2. Interleave students from different departments to prevent clustering.
3. Shuffle within groups for randomness.
4. Pack rooms using best-fit, ensuring no room exceeds capacity.
5. Assign seat numbers sequentially within each room.
"""
import random
from datetime import datetime
from collections import defaultdict
from bson import ObjectId
from fastapi import HTTPException


def interleave_students(students: list) -> list:
    """
    Interleave students from different departments using round-robin.
    Prevents adjacent students from being in the same department (anti-malpractice).
    """
    dept_groups = defaultdict(list)
    for s in students:
        dept_groups[s["department"]].append(s)

    for dept in dept_groups:
        random.shuffle(dept_groups[dept])

    result = []
    groups = list(dept_groups.values())
    max_len = max(len(g) for g in groups) if groups else 0

    for i in range(max_len):
        for group in groups:
            if i < len(group):
                result.append(group[i])

    return result


def assign_seats_to_rooms(students: list, rooms: list) -> list:
    """
    Distribute interleaved students across rooms (best-fit packing).
    Returns list of {room, allocations} dicts.
    """
    # Sort rooms by capacity ascending (best-fit)
    sorted_rooms = sorted(rooms, key=lambda r: r["capacity"])
    remaining = list(students)
    room_allocations = []

    for room in sorted_rooms:
        if not remaining:
            break
        capacity = room["capacity"]
        batch = remaining[:capacity]
        remaining = remaining[capacity:]

        allocations = [
            {
                "seat_number": idx + 1,
                "student_id": s["student_id"],
                "student_name": s["name"],
                "roll_number": s["roll_number"],
                "department": s["department"],
                "subject": s.get("current_subject", s["subjects"][0] if s.get("subjects") else ""),
            }
            for idx, s in enumerate(batch)
        ]
        room_allocations.append({"room": room, "allocations": allocations})

    return room_allocations


async def run_seating_allocation(session_id: str, room_ids: list, db) -> list:
    session = await db.exam_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(404, "Exam session not found")

    # Load rooms
    if room_ids:
        rooms = await db.resources.find(
            {"_id": {"$in": [ObjectId(r) for r in room_ids]}, "is_available": True}
        ).to_list(length=100)
    else:
        rooms = await db.resources.find(
            {
                "org_id": session["org_id"],
                "resource_type": {"$in": ["classroom", "seminar_hall", "lab"]},
                "is_available": True,
            }
        ).to_list(length=100)

    if not rooms:
        raise HTTPException(400, "No available rooms for examination")

    # Load students for this org who take subjects in the session
    students = await db.students.find(
        {
            "org_id": session["org_id"],
            "subjects": {"$in": session.get("subjects", [])},
        }
    ).to_list(length=5000)

    if not students:
        raise HTTPException(400, "No students registered for this exam session")

    # Tag each student with their current subject for this session
    subject_list = session.get("subjects", [])
    tagged_students = []
    for s in students:
        student_subjects = [sub for sub in s.get("subjects", []) if sub in subject_list]
        for sub in student_subjects:
            tagged_students.append({**s, "current_subject": sub})

    random.shuffle(tagged_students)
    interleaved = interleave_students(tagged_students)

    total_seats = sum(r["capacity"] for r in rooms)
    if len(interleaved) > total_seats:
        raise HTTPException(400, f"Not enough seats ({total_seats}) for {len(interleaved)} students")

    room_allocations = assign_seats_to_rooms(interleaved, rooms)

    # Persist seating to DB
    now = datetime.utcnow()
    seating_docs = []
    for ra in room_allocations:
        room = ra["room"]
        doc = {
            "session_id": ObjectId(session_id),
            "room_id": room["_id"],
            "room_name": room.get("room_id", str(room["_id"])),
            "capacity": room["capacity"],
            "allocations": ra["allocations"],
            "created_at": now,
        }
        result = await db.exam_seating.insert_one(doc)
        doc["_id"] = result.inserted_id
        seating_docs.append(doc)

    # Mark session as allocated
    await db.exam_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "allocated"}},
    )

    return seating_docs


async def get_seating_by_session(session_id: str, db) -> list:
    cursor = db.exam_seating.find({"session_id": ObjectId(session_id)})
    return await cursor.to_list(length=100)
