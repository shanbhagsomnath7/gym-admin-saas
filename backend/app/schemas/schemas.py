from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr

# --- Gym Schemas ---
class GymBase(BaseModel):
    name: str
    owner_name: str
    email: EmailStr
    phone: str

class GymCreate(GymBase):
    password: str

class GymOut(GymBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Plan Schemas ---
class PlanBase(BaseModel):
    name: str
    duration_days: int
    price: float

class PlanCreate(PlanBase):
    pass

class PlanOut(PlanBase):
    id: UUID
    gym_id: UUID

    class Config:
        from_attributes = True

# --- Member Schemas ---
class MemberBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    plan_id: Optional[UUID] = None
    join_date: Optional[date] = None
    expiry_date: date
    is_active: bool = True

class MemberCreate(MemberBase):
    pass

class MemberOut(MemberBase):
    id: UUID
    gym_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceCreate(BaseModel):
    member_id: UUID

class AttendanceOut(BaseModel):
    id: UUID
    gym_id: UUID
    member_id: UUID
    check_in_date: date
    check_in_time: datetime

    class Config:
        from_attributes = True

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    gym_id: UUID
    gym_name: str
    owner_name: str