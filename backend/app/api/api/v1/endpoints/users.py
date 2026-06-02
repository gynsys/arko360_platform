"""
User endpoints for authenticated doctors to manage their own account.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from app.db.base import get_db
from app.db.models.doctor import Doctor

from app.db.models.module import Module
from app.db.models.tenant_module import TenantModule
from app.schemas.doctor import (
    DoctorInDB, DoctorUpdate, 
    CertificationInDB, CertificationCreate, CertificationUpdate,
    ModuleSimple
)
from app.core.security import hash_password
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/me", response_model=DoctorInDB)
async def get_current_user_info(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user's information.
    """
    try:
        # Refresh the user from database
        db.refresh(current_user)
        
        # Populate modules_status
        all_modules = db.query(Module).all()
        
        # FIX: Query TenantModule directly instead of relationship
        # user_modules_map = {tm.module_id: tm.is_enabled for tm in current_user.tenant_modules}
        tenant_modules_records = db.query(TenantModule).filter(TenantModule.tenant_id == current_user.id).all()
        user_modules_map = {tm.module_id: tm.is_enabled for tm in tenant_modules_records}
        
        modules_status = []
        for mod in all_modules:
            # Default to False if no record exists
            is_enabled = user_modules_map.get(mod.id, False)
            modules_status.append(ModuleSimple(
                code=mod.code,
                name=mod.name,
                description=mod.description,
                is_enabled_for_user=is_enabled
            ))
            
        # Create response object and attach calculated field
        # We need to construct it carefully to ensure Pydantic validates it
        doctor_data = DoctorInDB.model_validate(current_user)
        doctor_data.modules_status = modules_status
        
        return doctor_data
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error retrieving user info: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener información del usuario."
        )


@router.put("/me", response_model=DoctorInDB)
async def update_current_user(
    doctor_update: DoctorUpdate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Update current authenticated user's information.
    """
    # Update fields if provided
    if doctor_update.nombre_completo is not None:
        current_user.nombre_completo = doctor_update.nombre_completo
    if doctor_update.especialidad is not None:
        current_user.especialidad = doctor_update.especialidad
    if doctor_update.biografia is not None:
        current_user.biografia = doctor_update.biografia
    if doctor_update.universidad is not None:
        current_user.universidad = doctor_update.universidad
    if doctor_update.services_section_title is not None:
        current_user.services_section_title = doctor_update.services_section_title
    if doctor_update.logo_url is not None:
        current_user.logo_url = doctor_update.logo_url
    if doctor_update.photo_url is not None:
        current_user.photo_url = doctor_update.photo_url
    if doctor_update.theme_primary_color is not None:
        current_user.theme_primary_color = doctor_update.theme_primary_color
    if doctor_update.theme_body_bg_color is not None:
        current_user.theme_body_bg_color = doctor_update.theme_body_bg_color
    if doctor_update.theme_container_bg_color is not None:
        current_user.theme_container_bg_color = doctor_update.theme_container_bg_color
    if doctor_update.design_template is not None:
        current_user.design_template = doctor_update.design_template
    if doctor_update.profile_image_border is not None:
        current_user.profile_image_border = doctor_update.profile_image_border
    
    if doctor_update.card_shadow is not None:
        current_user.card_shadow = doctor_update.card_shadow
    if doctor_update.container_shadow is not None:
        current_user.container_shadow = doctor_update.container_shadow
    if doctor_update.gallery_width is not None:
        current_user.gallery_width = doctor_update.gallery_width
    if doctor_update.contact_email is not None:
        current_user.contact_email = doctor_update.contact_email
        
    if doctor_update.schedule is not None:
        current_user.schedule = doctor_update.schedule

    if doctor_update.pdf_config is not None:
        current_user.pdf_config = doctor_update.pdf_config
        
    # Social Media
    if doctor_update.social_youtube is not None:
        current_user.social_youtube = doctor_update.social_youtube
    if doctor_update.social_instagram is not None:
        current_user.social_instagram = doctor_update.social_instagram
    if doctor_update.social_tiktok is not None:
        current_user.social_tiktok = doctor_update.social_tiktok
    if doctor_update.social_x is not None:
        current_user.social_x = doctor_update.social_x
    if doctor_update.social_facebook is not None:
        current_user.social_facebook = doctor_update.social_facebook
    if doctor_update.whatsapp_url is not None:
        current_user.whatsapp_url = doctor_update.whatsapp_url

    if doctor_update.show_certifications_carousel is not None:
        current_user.show_certifications_carousel = doctor_update.show_certifications_carousel

    if doctor_update.password is not None:
        current_user.password_hash = hash_password(doctor_update.password)
        
    # Handle Module Updates
    if doctor_update.enabled_modules is not None:
        # Get all system modules map [code -> id]
        all_modules = db.query(Module).all()
        module_map = {m.code: m.id for m in all_modules}
        
        # Get current tenant modules map [module_id -> TenantModule]
        # current_tenant_modules = {tm.module_id: tm for tm in current_user.tenant_modules}
        tenant_modules_records = db.query(TenantModule).filter(TenantModule.tenant_id == current_user.id).all()
        current_tenant_modules = {tm.module_id: tm for tm in tenant_modules_records}
        
        target_enabled_codes = set(doctor_update.enabled_modules)
        
        for mod_code, mod_id in module_map.items():
            should_be_enabled = mod_code in target_enabled_codes
            
            if mod_id in current_tenant_modules:
                # Update existing
                if current_tenant_modules[mod_id].is_enabled != should_be_enabled:
                    current_tenant_modules[mod_id].is_enabled = should_be_enabled
            else:
                # Create new relation if it should be enabled (or disabled, to be explicit)
                # Actually, simply creating it allows us to track it.
                # If we want to save space we could only create if True, but creating for False
                # makes 'is_enabled_for_user' logic simpler (record exists -> check value).
                # Current logic above (GET): 'user_modules_map.get(mod.id, False)'. 
                # So if no record, it is False. 
                # If we want it False, we can just NOT create it. 
                # BUT if it was previously True and now we want False, we must update to False.
                
                if should_be_enabled:
                   # Only create if we are enabling it. 
                   # If we want to disable and it doesn't exist, it's effectively disabled already.
                   new_tm = TenantModule(tenant_id=current_user.id, module_id=mod_id, is_enabled=True)
                   db.add(new_tm)

    db.commit()
    db.refresh(current_user)
    
    # Re-calculate modules_status for response
    all_modules = db.query(Module).all()
    # Need to reload tenant_modules relationship - relationship is disabled, query manually
    # db.refresh(current_user, attribute_names=["tenant_modules"])
    
    tenant_modules_records_updated = db.query(TenantModule).filter(TenantModule.tenant_id == current_user.id).all()
    user_modules_map = {tm.module_id: tm.is_enabled for tm in tenant_modules_records_updated}
    
    modules_status = []
    for mod in all_modules:
        is_enabled = user_modules_map.get(mod.id, False)
        modules_status.append(ModuleSimple(
            code=mod.code,
            name=mod.name,
            description=mod.description,
            is_enabled_for_user=is_enabled
        ))
        
    doctor_data = DoctorInDB.model_validate(current_user)
    doctor_data.modules_status = modules_status
    
    return doctor_data


# --- Certification Endpoints ---

@router.get("/certifications", response_model=List[CertificationInDB])
def get_certifications(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Get all certifications for the current doctor."""
    return current_user.certifications


@router.post("/certifications", response_model=CertificationInDB, status_code=status.HTTP_201_CREATED)
def create_certification(
    certification: CertificationCreate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Create a new certification for the current doctor."""
    from app.db.models.doctor import DoctorCertification
    
    db_cert = DoctorCertification(
        **certification.model_dump(),
        doctor_id=current_user.id
    )
    db.add(db_cert)
    db.commit()
    db.refresh(db_cert)
    return db_cert


@router.delete("/certifications/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certification(
    cert_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Delete a certification."""
    from app.db.models.doctor import DoctorCertification
    
    db_cert = db.query(DoctorCertification).filter(
        DoctorCertification.id == cert_id,
        DoctorCertification.doctor_id == current_user.id
    ).first()
    
    if not db_cert:
        raise HTTPException(status_code=404, detail="Certification not found")
        
    db.delete(db_cert)
    db.commit()
    return None


@router.patch("/certifications/{cert_id}", response_model=CertificationInDB)
def update_certification(
    cert_id: int,
    cert_update: CertificationUpdate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Update a certification."""
    from app.db.models.doctor import DoctorCertification
    
    db_cert = db.query(DoctorCertification).filter(
        DoctorCertification.id == cert_id,
        DoctorCertification.doctor_id == current_user.id
    ).first()
    
    if not db_cert:
        raise HTTPException(status_code=404, detail="Certification not found")
        
    update_data = cert_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_cert, field, value)
        
    db.commit()
    db.refresh(db_cert)
    return db_cert

