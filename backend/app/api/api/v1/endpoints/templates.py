from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models.preconsultation_template import PreconsultationTemplate
from app.schemas.template import Template, TemplateCreate, TemplateUpdate
from app.api.v1.endpoints.auth import get_current_admin_user
from app.db.models.doctor import Doctor

router = APIRouter(prefix="/templates", tags=["templates"])

@router.get("/", response_model=List[Template])
def read_templates(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    query = db.query(PreconsultationTemplate)
    if active_only:
        query = query.filter(PreconsultationTemplate.is_active == True)
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=Template, status_code=status.HTTP_201_CREATED)
def create_template(
    template: TemplateCreate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    db_template = PreconsultationTemplate(
        name=template.name,
        description=template.description,
        questions=template.questions,
        is_active=template.is_active
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/{template_id}", response_model=Template)
def read_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    template = db.query(PreconsultationTemplate).filter(PreconsultationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/{template_id}", response_model=Template)
def update_template(
    template_id: int,
    template_update: TemplateUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    db_template = db.query(PreconsultationTemplate).filter(PreconsultationTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    db_template = db.query(PreconsultationTemplate).filter(PreconsultationTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_template)
    db.commit()
    return {"message": "Template deleted successfully"}
