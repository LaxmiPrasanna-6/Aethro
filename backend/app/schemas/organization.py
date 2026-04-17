from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str
    org_type: str
    address: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    type: str
    address: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    admin_id: Optional[str] = None
    created_at: datetime
