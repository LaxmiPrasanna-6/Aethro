"""
MongoDB collections:
  - exam_sessions  : exam event metadata
  - exam_seating   : per-room seat allocations
  - students       : student registry for exam allocation
"""

EXAM_SESSION_SCHEMA = {
    "_id": "ObjectId",
    "org_id": "ObjectId",
    "exam_name": "str",
    "date": "date",
    "time_slot": {"start": "HH:MM", "end": "HH:MM"},
    "subjects": ["str"],
    "departments": ["str"],
    "status": "pending|allocated|completed",
    "created_by": "ObjectId",
    "created_at": "datetime",
}

EXAM_SEATING_SCHEMA = {
    "_id": "ObjectId",
    "session_id": "ObjectId",
    "room_id": "ObjectId",
    "room_name": "str",
    "capacity": "int",
    "allocations": [
        {
            "seat_number": "int",
            "student_id": "str",
            "student_name": "str",
            "roll_number": "str",
            "department": "str",
            "subject": "str",
        }
    ],
    "created_at": "datetime",
}

STUDENT_SCHEMA = {
    "_id": "ObjectId",
    "org_id": "ObjectId",
    "student_id": "str",
    "name": "str",
    "roll_number": "str",
    "department": "str",
    "semester": "int",
    "subjects": ["str"],
    "email": "str",
}
