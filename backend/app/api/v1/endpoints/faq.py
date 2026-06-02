"""
FAQ endpoints for managing frequently asked questions.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.faq import FAQ
from app.schemas.faq import (
    FAQCreate,
    FAQUpdate,
    FAQInDB,
    FAQPublic
)
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/public/{doctor_slug}", response_model=List[FAQPublic])
async def get_public_faqs(
    doctor_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get all FAQs for a doctor (public endpoint).
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == doctor_slug).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    faqs = db.query(FAQ).filter(
        FAQ.doctor_id == doctor.id
    ).order_by(
        FAQ.display_order.asc(),
        FAQ.created_at.asc()
    ).all()
    
    return faqs


@router.post("/", response_model=FAQInDB, status_code=status.HTTP_201_CREATED)
async def create_faq(
    faq_data: FAQCreate,
    db: Session = Depends(get_db),
    current_user: Annotated[Doctor, Depends(get_current_user)] = None
):
    """
    Create a new FAQ for the current doctor.
    """
    faq = FAQ(
        doctor_id=current_user.id,
        question=faq_data.question,
        answer=faq_data.answer,
        display_order=faq_data.display_order
    )
    
    db.add(faq)
    db.commit()
    db.refresh(faq)
    
    return faq


@router.get("/", response_model=List[FAQInDB])
async def get_my_faqs(
    db: Session = Depends(get_db),
    current_user: Annotated[Doctor, Depends(get_current_user)] = None
):
    """
    Get all FAQs for the current doctor.
    """
    faqs = db.query(FAQ).filter(
        FAQ.doctor_id == current_user.id
    ).order_by(
        FAQ.display_order.asc(),
        FAQ.created_at.asc()
    ).all()
    
    return faqs


@router.put("/{faq_id}", response_model=FAQInDB)
async def update_faq(
    faq_id: int,
    faq_update: FAQUpdate,
    db: Session = Depends(get_db),
    current_user: Annotated[Doctor, Depends(get_current_user)] = None
):
    """
    Update an existing FAQ.
    """
    faq = db.query(FAQ).filter(
        FAQ.id == faq_id,
        FAQ.doctor_id == current_user.id
    ).first()
    
    if not faq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    # Update fields
    update_data = faq_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faq, field, value)
    
    db.commit()
    db.refresh(faq)
    
    return faq


@router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: Annotated[Doctor, Depends(get_current_user)] = None
):
    """
    Delete an FAQ.
    """
    faq = db.query(FAQ).filter(
        FAQ.id == faq_id,
        FAQ.doctor_id == current_user.id
    ).first()
    
    if not faq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    db.delete(faq)
    db.commit()
    
    return None

