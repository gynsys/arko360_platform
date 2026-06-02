"""
API endpoints for symptom tracking in cycle predictor.
All endpoints require Cycle User authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.base import get_db
from app.db.models.cycle_user import CycleUser
from app.schemas.symptom import SymptomCreate, SymptomUpdate, SymptomResponse
from app.services import symptom_service
from app.api.v1.endpoints.cycle_users import get_current_cycle_user

router = APIRouter()


@router.post("/symptoms", response_model=SymptomResponse, status_code=status.HTTP_201_CREATED)
async def create_symptom(
    symptom_data: SymptomCreate,
    db: Session = Depends(get_db),
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """
    Create a new symptom log for the authenticated user.
    The doctor_id is automatically taken from the user's profile.
    """
    symptom = symptom_service.create_symptom(
        db=db,
        cycle_user_id=current_user.id,
        doctor_id=current_user.doctor_id,
        symptom_data=symptom_data
    )
    return symptom


@router.get("/symptoms", response_model=List[SymptomResponse])
async def get_symptoms(
    start_date: Optional[date] = Query(None, description="Filter symptoms from this date"),
    end_date: Optional[date] = Query(None, description="Filter symptoms until this date"),
    db: Session = Depends(get_db),
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """
    Get all symptom logs for the authenticated user.
    Optionally filter by date range.
    """
    symptoms = symptom_service.get_symptoms(
        db=db,
        cycle_user_id=current_user.id,
        start_date=start_date,
        end_date=end_date
    )
    return symptoms


@router.get("/symptoms/{symptom_id}", response_model=SymptomResponse)
async def get_symptom(
    symptom_id: int,
    db: Session = Depends(get_db),
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """
    Get a specific symptom log by ID.
    User can only access their own symptom logs.
    """
    symptom = symptom_service.get_symptom(
        db=db,
        symptom_id=symptom_id,
        cycle_user_id=current_user.id
    )
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symptom log not found"
        )
    return symptom


@router.patch("/symptoms/{symptom_id}", response_model=SymptomResponse)
async def update_symptom(
    symptom_id: int,
    update_data: SymptomUpdate,
    db: Session = Depends(get_db),
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """
    Update a symptom log.
    User can only update their own symptom logs.
    """
    symptom = symptom_service.update_symptom(
        db=db,
        symptom_id=symptom_id,
        cycle_user_id=current_user.id,
        update_data=update_data
    )
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symptom log not found"
        )
    return symptom


@router.delete("/symptoms/{symptom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_symptom(
    symptom_id: int,
    db: Session = Depends(get_db),
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """
    Delete a symptom log.
    User can only delete their own symptom logs.
    """
    success = symptom_service.delete_symptom(
        db=db,
        symptom_id=symptom_id,
        cycle_user_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symptom log not found"
        )
    return None
