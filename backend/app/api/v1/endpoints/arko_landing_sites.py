from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.landing_site import LandingSite, LandingSiteStatus
from app.api.v1.endpoints.arko import get_current_arko_admin
from app.core.logging import logger
from pydantic import BaseModel, EmailStr

router = APIRouter()

# Schemas for Landing Site
class LandingSiteCreate(BaseModel):
    email: EmailStr
    password: str
    nombre_cliente: str
    telefono: str | None = None
    especialidad: str | None = None
    slug: str
    custom_domain: str | None = None
    template_name: str = "construccion"

class LandingSiteUpdate(BaseModel):
    nombre_cliente: str | None = None
    telefono: str | None = None
    especialidad: str | None = None
    custom_domain: str | None = None
    status: LandingSiteStatus | None = None

class LandingSiteResponse(BaseModel):
    id: int
    email: str
    nombre_cliente: str
    telefono: str | None
    especialidad: str | None
    slug: str
    custom_domain: str | None
    template_name: str
    status: LandingSiteStatus

    class Config:
        from_attributes = True

@router.get("/", response_model=List[LandingSiteResponse])
def read_landing_sites(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_admin=Depends(get_current_arko_admin),
) -> Any:
    """
    Retrieve all landing sites (templates cloned).
    """
    sites = db.query(LandingSite).offset(skip).limit(limit).all()
    return sites

@router.post("/", response_model=LandingSiteResponse)
def create_landing_site(
    *,
    db: Session = Depends(get_db),
    site_in: LandingSiteCreate,
    current_admin=Depends(get_current_arko_admin),
) -> Any:
    """
    Clone a template and create a new Landing Site.
    """
    # Check if email exists
    if db.query(LandingSite).filter(LandingSite.email == site_in.email).first():
        logger.error(f"Email {site_in.email} already exists")
        raise HTTPException(
            status_code=400,
            detail="The site with this email already exists in the system.",
        )
    
    # Check if slug exists
    if db.query(LandingSite).filter(LandingSite.slug == site_in.slug).first():
        logger.error(f"Slug {site_in.slug} already exists")
        raise HTTPException(
            status_code=400,
            detail="The slug is already in use.",
        )

    # Note: password hashing should use pwd_context.hash
    # but for simplicity we rely on Arko's hash_password
    from app.core.security import hash_password
    
    db_site = LandingSite(
        email=site_in.email,
        password_hash=hash_password(site_in.password),
        nombre_cliente=site_in.nombre_cliente,
        telefono=site_in.telefono,
        especialidad=site_in.especialidad,
        slug=site_in.slug,
        custom_domain=site_in.custom_domain,
        template_name=site_in.template_name,
        status=LandingSiteStatus.ACTIVE,
    )
    
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    
    return db_site

@router.delete("/{site_id}", response_model=dict)
def delete_landing_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    current_admin=Depends(get_current_arko_admin),
) -> Any:
    """
    Delete a landing site.
    """
    site = db.query(LandingSite).filter(LandingSite.id == site_id).first()
    if not site:
        logger.error(f"Landing site {site_id} not found")
        raise HTTPException(status_code=404, detail="Landing site not found")
        
    db.delete(site)
    db.commit()
    return {"message": "Landing site deleted successfully"}
