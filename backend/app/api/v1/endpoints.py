from app.core.security import get_password_hash, verify_password, create_access_token
from app.schemas.schemas import (
    GymCreate, GymOut, GymUpdate
    MemberCreate, MemberOut, 
    PlanCreate, PlanOut,
    AttendanceCreate, AttendanceOut,
    LoginRequest, TokenResponse
)

from datetime import date
from app.models.models import Gym, Member, Plan, Attendance
from app.schemas.schemas import (
    GymCreate, GymOut, GymUpdate
    MemberCreate, MemberOut, 
    PlanCreate, PlanOut,
    AttendanceCreate, AttendanceOut
)

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Gym, Member, Plan
from app.schemas.schemas import GymCreate, GymOut, MemberCreate, MemberOut, PlanCreate, PlanOut

router = APIRouter()

# --- Gym Onboarding ---
@router.post("/gyms", response_model=GymOut, status_code=status.HTTP_201_CREATED)
def register_gym(gym_in: GymCreate, db: Session = Depends(get_db)):
    existing = db.query(Gym).filter(Gym.email == gym_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Gym with this email already registered.")
    
    gym = Gym(
        name=gym_in.name,
        owner_name=gym_in.owner_name,
        email=gym_in.email,
        phone=gym_in.phone,
        hashed_password=get_password_hash(gym_in.password)
    )
    db.add(gym)
    db.commit()
    db.refresh(gym)

    # Automatically seed starter plans for every new gym tenant
    default_plans = [
        Plan(gym_id=gym.id, name="Monthly", duration_days=30, price=1500.0),
        Plan(gym_id=gym.id, name="Quarterly", duration_days=90, price=4000.0),
        Plan(gym_id=gym.id, name="Annual", duration_days=365, price=12000.0),
    ]
    db.add_all(default_plans)
    db.commit()

    return gym

@router.post("/auth/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    gym = db.query(Gym).filter(Gym.email == credentials.email).first()
    if not gym or not verify_password(credentials.password, gym.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(
        data={"sub": str(gym.id), "email": gym.email, "gym_name": gym.name}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        gym_id=gym.id,
        gym_name=gym.name,
        owner_name=gym.owner_name
    )

# --- Members Management (Multi-tenant via gym_id) ---
@router.post("/gyms/{gym_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(gym_id: UUID, member_in: MemberCreate, db: Session = Depends(get_db)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found.")
    
    new_member = Member(
        gym_id=gym_id,
        full_name=member_in.full_name,
        phone=member_in.phone,
        email=member_in.email,
        plan_id=member_in.plan_id,
        join_date=member_in.join_date,
        expiry_date=member_in.expiry_date,
        is_active=member_in.is_active
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.get("/gyms/{gym_id}/members", response_model=List[MemberOut])
def list_members(gym_id: UUID, db: Session = Depends(get_db)):
    return db.query(Member).filter(Member.gym_id == gym_id).all()

@router.delete("/gyms/{gym_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(gym_id: UUID, member_id: UUID, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.id == member_id, Member.gym_id == gym_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    db.delete(member)
    db.commit()
    return None

# --- Plans Management ---
@router.post("/gyms/{gym_id}/plans", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(gym_id: UUID, plan_in: PlanCreate, db: Session = Depends(get_db)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found.")
    
    new_plan = Plan(
        gym_id=gym_id,
        name=plan_in.name,
        duration_days=plan_in.duration_days,
        price=plan_in.price
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan

@router.get("/gyms/{gym_id}/plans", response_model=List[PlanOut])
def list_plans(gym_id: UUID, db: Session = Depends(get_db)):
    return db.query(Plan).filter(Plan.gym_id == gym_id).all()

# --- Daily Attendance & Check-in ---
@router.post("/gyms/{gym_id}/checkin", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def checkin_member(gym_id: UUID, payload: AttendanceCreate, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.id == payload.member_id, Member.gym_id == gym_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    today = date.today()

    # Prevent duplicate check-ins on the same calendar day
    existing = db.query(Attendance).filter(
        Attendance.gym_id == gym_id,
        Attendance.member_id == payload.member_id,
        Attendance.check_in_date == today
    ).first()
    if existing:
        return existing

    record = Attendance(
        gym_id=gym_id,
        member_id=payload.member_id,
        check_in_date=today
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/gyms/{gym_id}/attendance/today", response_model=List[UUID])
def get_today_checkins(gym_id: UUID, db: Session = Depends(get_db)):
    today = date.today()
    records = db.query(Attendance.member_id).filter(
        Attendance.gym_id == gym_id,
        Attendance.check_in_date == today
    ).all()
    return [r[0] for r in records]

@router.patch("/gyms/{gym_id}/profile", response_model=GymOut)
def update_gym_profile(gym_id: UUID, payload: GymUpdate, db: Session = Depends(get_db)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found.")

    # Update basic profile fields
    if payload.name:
        gym.name = payload.name.strip()
    if payload.owner_name:
        gym.owner_name = payload.owner_name.strip()
    if payload.phone:
        gym.phone = payload.phone.strip()

    # Password update logic with verification
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=400, 
                detail="Current password is required to set a new password."
            )
        if not verify_password(payload.current_password, gym.hashed_password):
            raise HTTPException(
                status_code=400, 
                detail="Incorrect current password."
            )
        gym.hashed_password = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(gym)
    return gym