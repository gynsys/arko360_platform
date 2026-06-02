"""
Diffusion Campaigns endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.campaign import DiffusionCampaign, CampaignContact
from app.db.models.recommendation import Recommendation
from app.db.models.patient import Patient
from app.db.models.cycle_user import CycleUser
from app.db.models.consultation import Consultation
from app.blog.models import BlogPost
from app.schemas.campaign import (
    DiffusionCampaignCreate, 
    DiffusionCampaignResponse, 
    DiffusionSource,
    CampaignContactCreate,
    CampaignContactUpdate,
    CampaignContactResponse
)
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# --- Campaigns ---

@router.get("/sources", response_model=List[DiffusionSource])
async def get_campaign_sources(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Get available blog posts and recommendations for the current doctor.
    """
    sources = []
    
    # 1. Fetch Blog Posts
    # We use .is_(True) for explicit boolean comparison in some DB dialects
    posts = db.query(BlogPost).filter(
        BlogPost.doctor_id == current_user.id,
        BlogPost.is_published.is_(True)
    ).order_by(BlogPost.created_at.desc()).all()
    
    for post in posts:
        sources.append(DiffusionSource(
            id=post.id,
            title=post.title,
            type="blog",
            summary=post.summary,
            cover_image=post.cover_image,
            url=f"/blog/{post.slug}"
        ))
        
    # 2. Fetch Recommendations
    recoms = db.query(Recommendation).filter(
        Recommendation.tenant_id == current_user.id,
        Recommendation.is_active.is_(True)
    ).all()
    
    for recom in recoms:
        sources.append(DiffusionSource(
            id=recom.id,
            title=recom.title,
            type="recommendation",
            summary=recom.description[:150] if recom.description else None,
            cover_image=recom.image_url,
            url=recom.action_url
        ))
        
    return sources

@router.post("/", response_model=DiffusionCampaignResponse)
async def create_campaign(
    campaign_in: DiffusionCampaignCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Create a new campaign and trigger sending.
    """
    campaign = DiffusionCampaign(
        **campaign_in.model_dump(),
        tenant_id=current_user.id,
        status="sending"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Trigger Celery Task
    from app.tasks.campaigns import process_diffusion_campaign
    process_diffusion_campaign.delay(campaign.id)
    
    return campaign

@router.get("/", response_model=List[DiffusionCampaignResponse])
async def list_campaigns(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Get campaign history for the current doctor.
    """
    return db.query(DiffusionCampaign).filter(
        DiffusionCampaign.tenant_id == current_user.id
    ).order_by(DiffusionCampaign.created_at.desc()).all()


# --- Contacts Management ---

@router.get("/contacts", response_model=List[CampaignContactResponse])
async def list_contacts(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Get all campaign contacts for the current doctor.
    """
    return db.query(CampaignContact).filter(
        CampaignContact.tenant_id == current_user.id,
        CampaignContact.is_active == True
    ).order_by(CampaignContact.full_name.asc()).all()

@router.post("/contacts", response_model=CampaignContactResponse)
async def create_contact(
    contact_in: CampaignContactCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Add a manual contact for campaigns.
    """
    # Check if email already exists for this tenant in contacts
    existing = db.query(CampaignContact).filter(
        CampaignContact.tenant_id == current_user.id,
        CampaignContact.email == contact_in.email.lower().strip()
    ).first()
    
    if existing:
        if not existing.is_active:
            # Reactivate
            existing.full_name = contact_in.full_name
            existing.phone = contact_in.phone
            existing.is_active = True
            db.commit()
            db.refresh(existing)
        
        # Whether it was active or just reactivated, return 200 OK
        return existing

    # Create new contact
    # Use model_dump(exclude={"email"}) to avoid multiple values for 'email' argument
    contact = CampaignContact(
        **contact_in.model_dump(exclude={"email"}),
        tenant_id=current_user.id,
        email=contact_in.email.lower().strip()
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.patch("/contacts/{contact_id}", response_model=CampaignContactResponse)
async def update_contact(
    contact_id: int,
    contact_in: CampaignContactUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Update a manual campaign contact.
    """
    contact = db.query(CampaignContact).filter(
        CampaignContact.id == contact_id,
        CampaignContact.tenant_id == current_user.id
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    update_data = contact_in.model_dump(exclude_unset=True)
    
    if "email" in update_data:
        new_email = update_data["email"].lower().strip()
        # Check if email taken by another contact
        existing = db.query(CampaignContact).filter(
            CampaignContact.tenant_id == current_user.id,
            CampaignContact.email == new_email,
            CampaignContact.id != contact_id,
            CampaignContact.is_active == True
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered for another contact")
        update_data["email"] = new_email

    for field, value in update_data.items():
        setattr(contact, field, value)
        
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Soft delete a campaign contact.
    """
    contact = db.query(CampaignContact).filter(
        CampaignContact.id == contact_id,
        CampaignContact.tenant_id == current_user.id
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    contact.is_active = False
    db.commit()
    return None

@router.post("/contacts/sync", response_model=dict)
async def sync_contacts_from_patients(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    One-way sync: Add all patients and app users as campaign contacts.
    Only adds missing ones (by email).
    """
    added_count = 0
    
    # 1. Sync Patients
    patients = db.query(Patient).filter(Patient.doctor_id == current_user.id).all()
    for p in patients:
        if not p.email: continue
        email = p.email.lower().strip()
        existing = db.query(CampaignContact).filter(
            CampaignContact.tenant_id == current_user.id,
            CampaignContact.email == email
        ).first()
        
        if not existing:
            contact = CampaignContact(
                tenant_id=current_user.id,
                full_name=p.name or "Paciente",
                email=email,
                phone=p.phone,
                patient_id=p.id,
                source="sync_patient"
            )
            db.add(contact)
            added_count += 1
        else:
            if not existing.patient_id:
                existing.patient_id = p.id
            if not existing.phone and p.phone:
                existing.phone = p.phone
            
    # 2. Sync CycleUsers (App Users)
    users = db.query(CycleUser).filter(CycleUser.doctor_id == current_user.id).all()
    for u in users:
        if not u.email: continue
        email = u.email.lower().strip()
        existing = db.query(CampaignContact).filter(
            CampaignContact.tenant_id == current_user.id,
            CampaignContact.email == email
        ).first()
        
        if not existing:
            contact = CampaignContact(
                tenant_id=current_user.id,
                full_name=u.nombre_completo or "Usuario App",
                email=email,
                cycle_user_id=u.id,
                source="sync_cycle"
            )
            db.add(contact)
            added_count += 1
        elif not existing.cycle_user_id:
            existing.cycle_user_id = u.id

    # 3. Sync from History (Consultations) - New universal sync
    # This captures Adis and other historical snapshots
    consultations = db.query(Consultation).filter(Consultation.doctor_id == current_user.id).all()
    for c in consultations:
        if not c.patient_email: continue
        email = c.patient_email.lower().strip()
        existing = db.query(CampaignContact).filter(
            CampaignContact.tenant_id == current_user.id,
            CampaignContact.email == email
        ).first()

        if not existing:
            contact = CampaignContact(
                tenant_id=current_user.id,
                full_name=c.patient_name or "Paciente (Historial)",
                email=email,
                phone=c.patient_phone,
                ci=c.patient_ci,
                city=c.address,
                source="sync_history"
            )
            db.add(contact)
            added_count += 1
        else:
            # Enrich existing contact with missing data from consultation snapshot
            if not existing.ci and c.patient_ci:
                existing.ci = c.patient_ci
            if not existing.city and c.address:
                existing.city = c.address
            if not existing.phone and c.patient_phone:
                existing.phone = c.patient_phone
            
    db.commit()
    return {"status": "success", "added": added_count}
