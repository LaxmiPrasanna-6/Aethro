from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    confirm_password: str
    phone: str
    org_type: str  # college|hostel|lodge|hospital
    role: str
    org_name: Optional[str] = None
    department: Optional[str] = None
    club: Optional[str] = None

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("org_type")
    @classmethod
    def valid_org_type(cls, v):
        allowed = ["college", "hostel", "lodge", "hospital"]
        if v not in allowed:
            raise ValueError(f"org_type must be one of {allowed}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    phone: str
    org_type: str
    role: str
    org_id: Optional[str] = None
    department: Optional[str] = None
    club: Optional[str] = None
    is_authorized: bool
    reputation_score: float = 5.0
    no_show_count: int = 0
    fairness_score: float = 0.0
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    club: Optional[str] = None
    is_authorized: Optional[bool] = None
    is_active: Optional[bool] = None
