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
    
    # Store simple hash/pwd for dev setup
    gym = Gym(
        name=gym_in.name,
        owner_name=gym_in.owner_name,
        email=gym_in.email,
        phone=gym_in.phone,
        hashed_password=gym_in.password  # We will add bcrypt hashing utility next
    )
    db.add(gym)
    db.commit()
    db.refresh(gym)
    return gym

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