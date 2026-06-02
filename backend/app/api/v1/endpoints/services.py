from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.schemas.service import Service, ServiceCreate, ServiceUpdate
from app.crud import service as crud_service
from app.api.v1.endpoints.auth import get_current_user
from app.crud.admin import get_tenant_by_slug

router = APIRouter()

@router.get("/public/{slug}", response_model=List[Service])
def read_public_services(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Get all active services for a doctor (public endpoint).
    """
    doctor = get_tenant_by_slug(db, slug=slug)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    return crud_service.get_active_services_by_doctor(db, doctor_id=doctor.id)

@router.get("/me", response_model=List[Service])
def read_my_services(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Get all services for the current authenticated doctor.
    """
    return crud_service.get_services_by_doctor(db, doctor_id=current_user.id)

@router.post("/", response_model=Service)
def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Create a new service.
    """
    return crud_service.create_service(db, service=service, doctor_id=current_user.id)

@router.put("/{service_id}", response_model=Service)
def update_service(
    service_id: int,
    service_update: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Update a service.
    """
    db_service = crud_service.get_service(db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    if db_service.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this service")
    
    return crud_service.update_service(db, db_service=db_service, service_update=service_update)

@router.delete("/{service_id}", response_model=Service)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Delete a service.
    """
    db_service = crud_service.get_service(db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    if db_service.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this service")
    
    return crud_service.delete_service(db, service_id=service_id)
