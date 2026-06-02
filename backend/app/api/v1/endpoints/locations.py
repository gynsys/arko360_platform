from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.location import Location
from app.db.models.doctor import Doctor
from app.schemas import location as schemas
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Location])
def read_my_locations(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Get all locations for the current doctor.
    """
    return db.query(Location).filter(Location.doctor_id == current_user.id).all()

@router.post("/", response_model=schemas.Location)
def create_location(
    location: schemas.LocationCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Create a new location.
    """
    db_location = Location(**location.model_dump(), doctor_id=current_user.id)
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.put("/{location_id}", response_model=schemas.Location)
def update_location(
    location_id: int,
    location: schemas.LocationUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Update a location.
    """
    db_location = db.query(Location).filter(Location.id == location_id, Location.doctor_id == current_user.id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    update_data = location.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_location, key, value)
    
    db.commit()
    db.refresh(db_location)
    return db_location

@router.delete("/{location_id}")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Delete a location.
    """
    db_location = db.query(Location).filter(Location.id == location_id, Location.doctor_id == current_user.id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    db.delete(db_location)
    db.commit()
    return {"ok": True}

@router.get("/public/{doctor_slug}", response_model=List[schemas.Location])
def read_public_locations(
    doctor_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get locations for a doctor (public).
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == doctor_slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    return db.query(Location).filter(Location.doctor_id == doctor.id, Location.is_active == True).all()
