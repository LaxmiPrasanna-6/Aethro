"""
Room / resource schemas — SEPARATE per organisation type.

Each org type has its own Create + Response + Filter schema with the fields
that make sense for that domain, plus validators that enforce domain rules.

    college  -> CollegeRoomCreate   (classroom / lab / seminar hall)
    hostel   -> HostelRoomCreate    (student beds, sharing, AC/non-AC)
    lodge    -> LodgeRoomCreate     (guest rooms, sharing, food option)
    hospital -> HospitalResourceCreate  (ward / ICU / OT / consultation)

A permissive ResourceCreate / ResourceFilter union remains available for
legacy endpoints that still accept the same payload shape.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime


# ─── College ──────────────────────────────────────────────────────────────────

CollegeResourceType = Literal["classroom", "lab", "seminar_hall"]


class CollegeRoomCreate(BaseModel):
    block: Optional[str] = None
    room_id: str
    resource_type: CollegeResourceType
    capacity: int = Field(gt=0)
    facilities: List[str] = []

    @field_validator("room_id")
    @classmethod
    def _strip_room_id(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("room_id is required")
        return v


class CollegeRoomResponse(CollegeRoomCreate):
    id: str
    org_id: str
    org_type: Literal["college"] = "college"
    is_available: bool
    current_occupancy: int
    created_at: datetime


class CollegeRoomFilter(BaseModel):
    resource_type: Optional[CollegeResourceType] = None
    min_capacity: Optional[int] = None
    facilities: List[str] = []
    block: Optional[str] = None
    date: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None


# ─── Hostel ───────────────────────────────────────────────────────────────────

HostelRoomType = Literal["ac", "non_ac"]


class HostelRoomCreate(BaseModel):
    room_id: str
    floor: int = Field(ge=0)
    capacity: int = Field(gt=0, description="Number of beds in the room")
    room_type: HostelRoomType = "non_ac"
    sharing_type: Optional[int] = Field(default=None, ge=1, le=6)
    features: List[str] = []
    # helper carried through for the DB layer
    resource_type: Literal["room"] = "room"

    @field_validator("room_id")
    @classmethod
    def _strip_room_id(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("room_id is required")
        return v


class HostelRoomResponse(HostelRoomCreate):
    id: str
    org_id: str
    org_type: Literal["hostel"] = "hostel"
    is_available: bool
    current_occupancy: int
    created_at: datetime


class HostelRoomFilter(BaseModel):
    room_type: Optional[HostelRoomType] = None
    sharing_type: Optional[int] = None
    features: List[str] = []
    min_capacity: Optional[int] = None
    floor: Optional[int] = None
    date: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None


# ─── Lodge ────────────────────────────────────────────────────────────────────

LodgeRoomType = Literal["ac", "non_ac"]


class LodgeRoomCreate(BaseModel):
    room_id: str
    floor: int = Field(ge=0)
    capacity: int = Field(gt=0, description="Beds per room / sharing capacity")
    room_type: LodgeRoomType = "ac"
    sharing_type: Optional[int] = Field(default=None, ge=1, le=6)
    food_option: bool = False
    features: List[str] = []
    resource_type: Literal["room"] = "room"

    @field_validator("room_id")
    @classmethod
    def _strip_room_id(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("room_id is required")
        return v


class LodgeRoomResponse(LodgeRoomCreate):
    id: str
    org_id: str
    org_type: Literal["lodge"] = "lodge"
    is_available: bool
    current_occupancy: int
    created_at: datetime


class LodgeRoomFilter(BaseModel):
    room_type: Optional[LodgeRoomType] = None
    sharing_type: Optional[int] = None
    food_option: Optional[bool] = None
    features: List[str] = []
    min_capacity: Optional[int] = None
    date: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None


# ─── Hospital ─────────────────────────────────────────────────────────────────

HospitalResourceType = Literal["ward", "icu", "ot", "consultation", "bed"]


class HospitalResourceCreate(BaseModel):
    room_id: str
    resource_type: HospitalResourceType
    capacity: int = Field(gt=0)
    department: Optional[str] = None
    floor: int = Field(ge=0, default=0)
    facilities: List[str] = []

    @field_validator("room_id")
    @classmethod
    def _strip_room_id(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("room_id is required")
        return v


class HospitalResourceResponse(HospitalResourceCreate):
    id: str
    org_id: str
    org_type: Literal["hospital"] = "hospital"
    is_available: bool
    current_occupancy: int
    created_at: datetime


class HospitalResourceFilter(BaseModel):
    resource_type: Optional[HospitalResourceType] = None
    department: Optional[str] = None
    min_capacity: Optional[int] = None
    facilities: List[str] = []
    floor: Optional[int] = None
    date: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None


# ─── Legacy permissive schemas (kept so existing booking/analytics code keeps working) ──

class ResourceCreate(BaseModel):
    """Permissive create payload — used by code paths that accept mixed org types."""
    block: Optional[str] = None
    room_id: str
    resource_type: Optional[str] = None
    capacity: int
    facilities: Optional[List[str]] = []
    room_type: Optional[str] = None        # ac | non_ac
    sharing_type: Optional[int] = None
    food_option: Optional[bool] = None
    features: Optional[List[str]] = []
    floor: Optional[int] = None
    department: Optional[str] = None


class ResourceResponse(BaseModel):
    id: str
    org_id: str
    org_type: str
    block: Optional[str] = None
    room_id: str
    resource_type: str
    capacity: int
    facilities: List[str] = []
    room_type: Optional[str] = None
    sharing_type: Optional[int] = None
    food_option: Optional[bool] = None
    features: List[str] = []
    floor: Optional[int] = None
    department: Optional[str] = None
    is_available: bool
    current_occupancy: int
    created_at: datetime


class ResourceFilter(BaseModel):
    resource_type: Optional[str] = None
    min_capacity: Optional[int] = None
    facilities: Optional[List[str]] = []
    block: Optional[str] = None
    room_type: Optional[str] = None
    sharing_type: Optional[int] = None
    food_option: Optional[bool] = None
    features: Optional[List[str]] = []
    department: Optional[str] = None
    floor: Optional[int] = None
    date: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
