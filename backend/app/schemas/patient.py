from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str  # male / female / other
    contact: str
    symptoms: List[str]
    emergency: bool = False
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    status: Optional[str] = None           # registered/admitted/in_treatment/discharged
    assigned_doctor_id: Optional[str] = None
    assigned_resource_id: Optional[str] = None
    treatment_notes: Optional[str] = None
    emergency: Optional[bool] = None


class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    contact: str
    symptoms: List[str]
    emergency: bool
    notes: Optional[str] = None
    suggested_specialization: Optional[str] = None
    assigned_doctor_id: Optional[str] = None
    assigned_doctor_name: Optional[str] = None
    assigned_resource_id: Optional[str] = None
    assigned_resource_name: Optional[str] = None
    treatment_notes: Optional[str] = None
    status: str
    registered_by: str
    org_id: str
    created_at: datetime
    updated_at: datetime
