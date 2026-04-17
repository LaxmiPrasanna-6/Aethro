from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class TimeSlot(BaseModel):
    start: str  # "HH:MM"
    end: str


class BookingCreate(BaseModel):
    resource_type: Optional[str] = None
    required_capacity: int
    date: str          # "YYYY-MM-DD"
    time_slot: TimeSlot
    purpose: str
    priority: str      # low | medium | high
    justification: str
    required_facilities: Optional[List[str]] = []
    block: Optional[str] = None
    department: Optional[str] = None
    # Hospital bundle booking
    bundle_resources: Optional[List[str]] = []


class NLPBookingRequest(BaseModel):
    raw_text: str


class BookingResponse(BaseModel):
    id: str
    org_id: str
    resource_id: Optional[str] = None
    resource_info: Optional[Dict[str, Any]] = None
    user_id: str
    user_role: str
    org_type: str
    purpose: str
    priority: str
    status: str
    justification: str
    date: str
    time_slot: Dict[str, str]
    required_capacity: int
    required_facilities: List[str] = []
    nlp_parsed: bool = False
    nlp_raw_text: Optional[str] = None
    admin_approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    override_info: Optional[Dict] = None
    reassigned_from: Optional[str] = None
    waitlist_position: Optional[int] = None
    check_in_time: Optional[datetime] = None
    fairness_score: float = 0.0
    created_at: datetime


class BookingAction(BaseModel):
    action: str            # approve | reject | reassign | checkin
    reason: Optional[str] = None
    new_resource_id: Optional[str] = None


class ConflictInfo(BaseModel):
    conflicting_booking_id: str
    resource_id: str
    priority_comparison: str
    resolution: str        # override | reject | admin_decision | protected
    message: str
