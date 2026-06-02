"""
Testimonial endpoints for managing patient testimonials.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List
from sqlalchemy import desc

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.testimonial import Testimonial
from app.schemas.testimonial import (
    TestimonialCreate,
    TestimonialUpdate,
    TestimonialInDB,
    TestimonialPublic
)
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/public/{doctor_slug}")
async def get_public_testimonials(
    doctor_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get all approved testimonials for a doctor (public endpoint).
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == doctor_slug).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    testimonials = db.query(Testimonial).filter(
        Testimonial.doctor_id == doctor.id,
        Testimonial.is_approved == True
    ).order_by(
        desc(Testimonial.is_featured),
        desc(Testimonial.created_at)
    ).all()

    # Manual serialization to ensure stability
    serialized = [TestimonialPublic.model_validate(t).model_dump(mode='json') for t in testimonials]
    
    from fastapi.responses import JSONResponse
    return JSONResponse(content=serialized)


@router.post("/", response_model=TestimonialInDB, status_code=status.HTTP_201_CREATED)
async def create_testimonial(
    testimonial_data: TestimonialCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new testimonial (public endpoint for patients).
    """
    # Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == testimonial_data.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Validate rating if provided
    if testimonial_data.rating and (testimonial_data.rating < 1 or testimonial_data.rating > 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    db_testimonial = Testimonial(**testimonial_data.model_dump())
    db.add(db_testimonial)
    db.commit()
    db.refresh(db_testimonial)
    
    return db_testimonial


@router.get("/", response_model=List[TestimonialInDB])
async def get_my_testimonials(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Get all testimonials for current doctor (authenticated).
    """
    testimonials = db.query(Testimonial).filter(
        Testimonial.doctor_id == current_user.id
    ).order_by(desc(Testimonial.created_at)).all()
    
    return testimonials


@router.put("/{testimonial_id}", response_model=TestimonialInDB)
async def update_testimonial(
    testimonial_id: int,
    testimonial_update: TestimonialUpdate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Update a testimonial (only the doctor who owns it).
    """
    testimonial = db.query(Testimonial).filter(
        Testimonial.id == testimonial_id,
        Testimonial.doctor_id == current_user.id
    ).first()
    
    if not testimonial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testimonial not found"
        )
    
    # Update fields
    update_data = testimonial_update.model_dump(exclude_unset=True)
    pass
    
    # Check if photo_url was explicitly provided (even if None)
    if 'photo_url' in testimonial_update.model_dump(exclude_unset=False):
        update_data['photo_url'] = testimonial_update.photo_url
        pass
    
    for field, value in update_data.items():
        setattr(testimonial, field, value)
        pass
    
    db.commit()
    db.refresh(testimonial)
    
    pass
    
    return testimonial


@router.delete("/{testimonial_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_testimonial(
    testimonial_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Delete a testimonial (only the doctor who owns it).
    """
    testimonial = db.query(Testimonial).filter(
        Testimonial.id == testimonial_id,
        Testimonial.doctor_id == current_user.id
    ).first()
    
    if not testimonial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testimonial not found"
        )
    
    db.delete(testimonial)
    db.commit()
    
    return None
