from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ExamSessionCreate(BaseModel):
    exam_name: str
    date: str           # "YYYY-MM-DD"
    time_slot: Dict[str, str]
    subjects: List[str]
    departments: List[str]


class StudentCreate(BaseModel):
    student_id: str
    name: str
    roll_number: str
    department: str
    semester: int
    subjects: List[str]
    email: Optional[str] = None


class StudentsBulkCreate(BaseModel):
    students: List[StudentCreate]


class SeatingAllocationRequest(BaseModel):
    session_id: str
    room_ids: Optional[List[str]] = None    # if empty, use all available rooms


class SeatEntry(BaseModel):
    seat_number: int
    student_id: str
    student_name: str
    roll_number: str
    department: str
    subject: str


class RoomSeatingResponse(BaseModel):
    room_id: str
    room_name: str
    capacity: int
    allocated: int
    allocations: List[SeatEntry]


class ExamSessionResponse(BaseModel):
    id: str
    org_id: str
    exam_name: str
    date: str
    time_slot: Dict[str, str]
    subjects: List[str]
    departments: List[str]
    status: str
    created_by: str
    created_at: datetime
    rooms: Optional[List[RoomSeatingResponse]] = None
