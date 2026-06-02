from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Annotated
from pydantic import BaseModel, EmailStr
import secrets

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.plan import Plan
from app.api.v1.endpoints.auth import get_current_user
from fastapi import BackgroundTasks
from app.core.email import send_email

from app.core.security import hash_password
from app.core.limiter import limiter

router = APIRouter()

class StaffCreate(BaseModel):
    nombre_completo: str
    email: EmailStr
    password: str

class StaffResponse(BaseModel):
    id: int
    nombre_completo: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[StaffResponse])
def get_staff_members(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Get all staff members for the current clinic.
    """
    if current_user.role != "clinic" and current_user.role != "admin":
        # Only clinic admins can view their staff
        # If the user is an independent doctor, they will just get an empty list or an error
        # But we'll allow it so the UI doesn't crash, just returning []
        pass

    staff = db.query(Doctor).filter(
        Doctor.clinic_id == current_user.id
    ).all()
    
    return staff


@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def create_staff_member(
    request: Request,
    staff_data: StaffCreate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    """
    Create a new staff member (doctor) under the current clinic.
    """
    # Only clinics can create staff
    # But wait, what if the user hasn't explicitly set role='clinic'?
    # We can automatically promote them to 'clinic' if they add staff.
    if current_user.role == "user":
        current_user.role = "clinic"
        db.commit()

    # Get the plan to check limits
    plan = db.query(Plan).filter(Plan.id == current_user.plan_id).first()
    max_staff = plan.max_staff_members if plan and plan.max_staff_members is not None else 0
    
    current_staff_count = db.query(Doctor).filter(Doctor.clinic_id == current_user.id).count()
    if current_staff_count >= max_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Has alcanzado el límite de médicos permitidos en tu plan actual ({max_staff}). Contacta a soporte para mejorar tu plan institucional."
        )


    # Check if email exists
    existing = db.query(Doctor).filter(Doctor.email == staff_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )

    # Generate a unique slug based on clinic slug + staff name
    base_slug = f"{current_user.slug_url}-{staff_data.nombre_completo.lower().replace(' ', '-')}"
    
    # Create staff doctor
    new_staff = Doctor(
        email=staff_data.email,
        password_hash=hash_password(staff_data.password),
        nombre_completo=staff_data.nombre_completo,
        slug_url=base_slug,
        is_active=True,
        is_verified=True,
        status='approved',
        role='staff',
        clinic_id=current_user.id,
        plan_id=current_user.plan_id  # Inherit plan
    )
    
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    
    # Send email with temporary password
    subject = "¡Bienvenido a GynSys!"
    html_content = f"""
    <h1>Hola, {staff_data.nombre_completo}</h1>
    <p>Has sido agregado al sistema GynSys por <b>{current_user.nombre_completo}</b>.</p>
    <p>Tus credenciales de acceso temporal son:</p>
    <ul>
        <li><b>Correo:</b> {staff_data.email}</li>
        <li><b>Contraseña Temporal:</b> {staff_data.password}</li>
    </ul>
    <p>Por favor, inicia sesión y cambia tu contraseña lo antes posible por razones de seguridad.</p>
    <br>
    <p>Atentamente,<br>El equipo de GynSys</p>
    """
    
    # We use a background task to send the email without delaying the API response
    background_tasks.add_task(send_email, email_to=staff_data.email, subject=subject, html_content=html_content)
    
    return new_staff




@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff_member(
    staff_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Remove a staff member.
    """
    staff = db.query(Doctor).filter(
        Doctor.id == staff_id,
        Doctor.clinic_id == current_user.id
    ).first()
    
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado o no pertenece a tu clínica."
        )
        
    db.delete(staff)
    db.commit()
    return None
