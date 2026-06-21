"""
Authentication endpoints for login, registration, and OAuth.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated, Union, Optional
import re
import unicodedata
import uuid
from pydantic import BaseModel

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorInDB
import secrets
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
from app.schemas.token import Token, PasswordResetRequest, PasswordResetConfirm
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token
)
from app.services.email import send_reset_password_email
# apply_doctor_template_async removed temporarily or moved to valid location

from app.crud.admin import seed_tenant_data
from app.core.limiter import limiter

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")


def generate_slug_from_name(name: str) -> str:
    """
    Generate a URL-friendly slug from a name.
    """
    # Normalize unicode characters
    name = unicodedata.normalize('NFKD', name)
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug


def get_user_by_email(db: Session, email: str) -> Doctor | None:
    """Get a doctor by email."""
    return db.query(Doctor).filter(Doctor.email == email).first()


def get_user_by_slug(db: Session, slug: str) -> Doctor | None:
    """Get a doctor by slug."""
    return db.query(Doctor).filter(Doctor.slug_url == slug).first()





@router.post("/register", response_model=DoctorInDB, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
async def register(
    request: Request,
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new doctor account.
    
    Creates a new doctor with email/password authentication.
    Generates a unique slug_url from the doctor's name.
    """
    # Check if email already exists
    existing_doctor = get_user_by_email(db, doctor_data.email)
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate slug if not provided
    slug = doctor_data.slug_url or generate_slug_from_name(doctor_data.nombre_completo)
    
    # Check if slug already exists
    existing_slug = get_user_by_slug(db, slug)
    if existing_slug:
        # Append a number if slug exists
        counter = 1
        original_slug = slug
        while get_user_by_slug(db, slug):
            slug = f"{original_slug}-{counter}"
            counter += 1
    
    # Create new doctor
    hashed_password = hash_password(doctor_data.password)
    
    # Determine if it's a clinic based on plan_id (Plan Institucional = 3)
    is_clinic = False
    role = 'user'
    if doctor_data.plan_id == 3:
        is_clinic = True
        role = 'clinic'
    db_doctor = Doctor(
        email=doctor_data.email,
        password_hash=hashed_password,
        nombre_completo=doctor_data.nombre_completo,
        especialidad=doctor_data.especialidad,
        biografia=doctor_data.biografia,
        slug_url=slug,
        # New onboarding fields
        is_active=False,  # Inactive until approved
        status='pending',
        plan_id=doctor_data.plan_id,
        payment_reference=doctor_data.payment_reference,
        is_clinic=is_clinic,
        role=role
    )
    
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    
    # Commit initial doctor creation
    db.commit()
    db.refresh(db_doctor)
    
    # Async: Apply Mariel Herrera template (disabled for now)
    # try:
    #     apply_doctor_template_async.delay(db_doctor.id)
    # except Exception as e:
    #     print(f"[WARNING] Failed to queue template task: {e}")
    
    # Send notification to admin (disabled for now)
    # try:
    #     send_new_tenant_notification.delay({
    #         "nombre_completo": db_doctor.nombre_completo,
    #         "email": db_doctor.email,
    #         "plan_id": db_doctor.plan_id,
    #         "payment_reference": db_doctor.payment_reference
    #     })
    # except Exception as e:
    #     logger.error(f"Failed to queue new tenant notification for doctor {db_doctor.id}: {e}", exc_info=True)
    
    return db_doctor


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    Login endpoint that returns a JWT access token.
    
    TEMPORARILY DISABLED PASSWORD VERIFICATION FOR ADMIN TESTING
    """
    # Get user by email
    pass
    doctor = get_user_by_email(db, form_data.username)  # form_data.username is the email
    
    if not doctor:
        pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, doctor.password_hash):
        pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not doctor.is_active:
        detail_msg = "Account is pending approval" if doctor.status == 'pending' else "Account is inactive"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail_msg
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": doctor.email, "doctor_id": doctor.id, "user_type": "doctor"}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


class GoogleLoginRequest(BaseModel):
    token: str
    user_type: Optional[str] = None  # "doctor" or "cycle_user"

@router.post("/login/google", response_model=Token)
async def login_google(
    login_data: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with Google ID Token (from Frontend).
    Verifies the token and returns a JWT access token.
    Supports both Cycle Users (Patients) and Doctors.
    """
    from google.oauth2 import id_token
    from google.auth.transport import requests
    from app.core.config import settings
    from app.db.models.cycle_user import CycleUser
    
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )
        
    import requests as py_requests
    try:
        email = None
        name = ""
        
        # 1. Verify Google Token
        if len(login_data.token) > 500: # ID Token
            import google.auth.transport.requests
            request_session = py_requests.Session()
            req = google.auth.transport.requests.Request(session=request_session)
            id_info = id_token.verify_oauth2_token(login_data.token, req, settings.GOOGLE_CLIENT_ID)
            email = id_info.get("email")
            name = id_info.get("name", "")
        else: # Access Token
            response = py_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {login_data.token}"},
                timeout=5
            )
            if response.status_code != 200:
                raise ValueError("Invalid Google Access Token")
            user_info = response.json()
            email = user_info.get("email")
            name = user_info.get("name", "")

        if not email:
            raise ValueError("Could not retrieve email from Google")
            
        email = email.lower().strip()
        
        # 2. Identify User
        # If user_type is specified, we check that first.
        # If not specified, we check Doctor first (prioritizing Approved tenants).
        
        cycle_user = None
        doctor = None
        
        if login_data.user_type == "cycle_user":
            cycle_user = db.query(CycleUser).filter(CycleUser.email == email).first()
        elif login_data.user_type == "doctor":
            doctor = db.query(Doctor).filter(Doctor.email == email).first()
        else:
            # Automatic discovery (legacy/default)
            # Priority: Approved Doctor > Active CycleUser > Pending Doctor
            doctor = db.query(Doctor).filter(Doctor.email == email).first()
            cycle_user = db.query(CycleUser).filter(CycleUser.email == email).first()
            
            # If both exist, prioritize Doctor if they are approved
            if doctor and cycle_user:
                if doctor.status != 'approved':
                    # If doctor is pending, maybe they are logging in as patient for now?
                    # But usually, if they have a doctor account, they WANT that.
                    # Let's stick to Doctor if approved.
                    pass 
        
        user_type = login_data.user_type # Use requested if possible
        user_id = None
        doc_id = None

        # Resolve final identity
        if doctor and (login_data.user_type == "doctor" or not login_data.user_type):
            user_type = "doctor"
            user_id = doctor.id
            doc_id = doctor.id
            active_user = doctor
        elif cycle_user:
            user_type = "cycle_user"
            user_id = cycle_user.id
            doc_id = cycle_user.doctor_id
            active_user = cycle_user
        else:
            # 3. Handle Auto-Registration (For Doctors ONLY if whitelisted)
            from app.core.oauth_utils import is_email_whitelisted
            if is_email_whitelisted(email, db) and (not login_data.user_type or login_data.user_type == "doctor"):
                slug = generate_slug_from_name(name)
                counter = 1
                original_slug = slug
                while get_user_by_slug(db, slug):
                    slug = f"{original_slug}-{counter}"
                    counter += 1
                
                new_doctor = Doctor(
                    email=email,
                    nombre_completo=name,
                    slug_url=slug,
                    is_verified=True,
                    is_active=True,
                    status='approved',
                    role='user'
                )
                db.add(new_doctor)
                db.commit()
                db.refresh(new_doctor)
                user_id = new_doctor.id
                doc_id = new_doctor.id
                user_type = "doctor"
                active_user = new_doctor
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account not found. Please register first."
                )

        # 4. Final Verification
        if active_user and not active_user.is_active:
             raise HTTPException(status_code=403, detail="Account is inactive")

        # 5. Create JWT Token
        token_data = {
            "sub": email,
            "user_id": user_id,
            "user_type": user_type,
            "doctor_id": doc_id
        }
        access_token = create_access_token(data=token_data)
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError as e:
        logger.error(f"Google login validation error: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Error de autenticación con Google.")
    except Exception as e:
        logger.error(f"Google login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error de autenticación con Google. Intente nuevamente.")



# --- Guest / Patient Authentication ---

class GuestUser(BaseModel):
    id: str
    email: str # specific format: guest_UUID
    role: str = "guest"
    tenant_id: str
    nombre_completo: str

@router.post("/guest-login")
@limiter.limit("10/minute")
async def guest_login(
    request: Request,
    body: dict, # { "doctor_id": str, "name": str }
    db: Session = Depends(get_db)
):
    """
    Generate a guest token for a patient to chat with a specific doctor (tenant).
    
    Auto-creates a chat room between the guest and the doctor if it doesn't exist.
    """
    doctor_id = body.get("doctor_id")
    name = body.get("name", "Paciente")
    
    if not doctor_id:
        raise HTTPException(status_code=400, detail="Doctor ID required")
        
    # Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # Generate a random guest ID
    guest_id = str(uuid.uuid4())
    guest_email = f"guest_{guest_id}@gynsys.temp"
    
    # Encode tenant_id in the token so we know which context they belong to
    access_token = create_access_token(
        data={
            "sub": guest_email, 
            "user_id": guest_id, 
            "user_type": "guest",
            "role": "guest",
            "tenant_id": str(doctor_id), 
            "name": name
        },
        expires_delta=timedelta(days=30) # Long session for returning patients
    )
    
    # Auto-create a chat room between the guest and the doctor
    try:
        from app.chat.models import ChatRoom, ChatParticipant
        from sqlalchemy import text
        
        # Set RLS context for the doctor's tenant
        db.execute(
            text("SET app.current_tenant = :tenant_id"),
            {"tenant_id": str(doctor_id)}
        )
        
        # Check if a room already exists for this guest
        # (In case they're logging in again with the same guest_id somehow, or this is a retry)
        # This is a simplified check - in production you might want more sophisticated matching
        existing_room = db.query(ChatRoom)\
            .join(ChatParticipant)\
            .filter(ChatParticipant.user_id == guest_id)\
            .filter(ChatRoom.tenant_id == str(doctor_id))\
            .first()
        
        if not existing_room:
            # Create new room
            new_room = ChatRoom(
                tenant_id=str(doctor_id),
                type="direct",
                meta_data={"guest_name": name, "doctor_id": str(doctor_id)}
            )
            db.add(new_room)
            db.flush()  # Get the room ID
            
            # Add guest as participant
            guest_participant = ChatParticipant(
                room_id=new_room.id,
                user_id=guest_id,
                tenant_id=str(doctor_id),
                role="member"
            )
            db.add(guest_participant)
            
            # Add doctor as participant
            doctor_participant = ChatParticipant(
                room_id=new_room.id,
                user_id=str(doctor_id),
                tenant_id=str(doctor_id),
                role="owner"
            )
            db.add(doctor_participant)
            
            db.commit()
    except Exception as e:
        # Log the error but don't fail the login
        # The user can still create a room manually or via frontend
        print(f"Warning: Failed to auto-create chat room for guest {guest_id}: {e}")
        db.rollback()
    
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": guest_id, "name": name}}


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> Doctor | GuestUser:
    """
    Dependency to get the current authenticated user (Doctor or Guest) from JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_access_token(token)
        if payload is None:
            raise credentials_exception
            
        role = payload.get("role")
        
        if role == "guest":
            # Return a Guest User object (not from DB, just from Token)
            return GuestUser(
                id=payload.get("user_id"),
                email=payload.get("sub"),
                role="guest",
                tenant_id=payload.get("tenant_id"),
                nombre_completo=payload.get("name")
            )
            
        # Regular Doctor/Admin Logic
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        doctor = get_user_by_email(db, email)
        if doctor is None:
            raise credentials_exception
        
        return doctor
        
    except Exception:
        raise credentials_exception


@router.get("/me", response_model=DoctorInDB)
async def read_users_me(
    current_user: Annotated[Doctor, Depends(get_current_user)]
):
    """
    Get current user information.
    """
    return current_user


async def get_current_admin_user(
    current_user: Annotated[Doctor, Depends(get_current_user)]
) -> Doctor:
    """
    Dependency to get the current authenticated admin user.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user


def get_tenant_id(current_user: Annotated[Doctor | GuestUser, Depends(get_current_user)]) -> int:
    """
    Dependency to resolve the active tenant ID.
    If the user is a guest, returns their assigned tenant_id.
    If the user is a staff doctor, returns the clinic_id.
    If the user is an independent doctor or a clinic, returns their own id.
    """
    if getattr(current_user, 'role', '') == "guest":
        return int(current_user.tenant_id)
        
    # User is a Doctor
    if getattr(current_user, 'clinic_id', None) is not None:
        return current_user.clinic_id
        
    return current_user.id



@router.post("/password-recovery")
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset token.
    """
    doctor = get_user_by_email(db, request.email)
    if not doctor:
        # Return 200 even if email not found to prevent user enumeration
        return {"message": "If the email is registered, you will receive a reset link"}
    
    # Generate token
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    doctor.reset_password_token = token
    doctor.reset_password_expires = expires
    db.commit()
    
    # Send email
    send_reset_password_email.delay(doctor.email, token)
    
    return {"message": "If the email is registered, you will receive a reset link"}


@router.post("/reset-password")
async def reset_password(
    confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Reset password using token.
    """
    doctor = db.query(Doctor).filter(Doctor.reset_password_token == confirm.token).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
        
    if not doctor.reset_password_expires or doctor.reset_password_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expired"
        )
        
    # Update password
    doctor.password_hash = hash_password(confirm.new_password)
    doctor.reset_password_token = None
    doctor.reset_password_expires = None
    db.commit()
    
    return {"message": "Password updated successfully"}


# --- Patient Account Activation ---

class PatientActivationRequest(BaseModel):
    token: str
    password: str


@router.get("/patient/activation-info")
async def get_patient_activation_info(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Return email associated with an activation token without consuming it.
    Used by the frontend to pre-fill the email field in the activation form.
    """
    from app.db.models.patient_activation_token import PatientActivationToken

    if not token:
        raise HTTPException(status_code=400, detail="Token requerido")

    record = db.query(PatientActivationToken).filter(
        PatientActivationToken.token == token
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Token inválido o no encontrado")

    if record.used:
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado")

    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace ha expirado")

    # Fetch doctor theme info to help the frontend adapt the UI
    doctor = db.query(Doctor).filter(Doctor.id == record.doctor_id).first()

    return {
        "email": record.email,
        "valid": True,
        "doctor_name": doctor.nombre_completo if doctor else "",
        "doctor_slug": doctor.slug_url if doctor else "",
        "primary_color": doctor.theme_primary_color if doctor else "#7c3aed",
        "design_template": doctor.design_template if doctor else "glass",
    }


@router.post("/patient/activate")
async def activate_patient_account(
    body: PatientActivationRequest,
    db: Session = Depends(get_db)
):
    """
    Activate patient account using a one-time token.
    Creates or updates a CycleUser with the chosen password and returns a JWT.
    """
    from app.db.models.patient_activation_token import PatientActivationToken
    from app.db.models.cycle_user import CycleUser

    if not body.token or not body.password:
        raise HTTPException(status_code=400, detail="Token y contraseña son requeridos")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    record = db.query(PatientActivationToken).filter(
        PatientActivationToken.token == body.token
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Token inválido o no encontrado")

    if record.used:
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado")

    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace ha expirado. Solicite uno nuevo a su doctora")

    # Create or update CycleUser
    cycle_user = db.query(CycleUser).filter(CycleUser.email == record.email).first()

    if cycle_user:
        # Patient already exists — update password only
        cycle_user.password_hash = hash_password(body.password)
        cycle_user.is_active = True
    else:
        # Recover name from appointment if possible
        from app.db.models.appointment import Appointment
        patient_name = record.email.split("@")[0]
        if record.appointment_id:
            appt = db.query(Appointment).filter(
                Appointment.id == record.appointment_id
            ).first()
            if appt and appt.patient_name:
                patient_name = appt.patient_name

        cycle_user = CycleUser(
            email=record.email,
            password_hash=hash_password(body.password),
            nombre_completo=patient_name,
            doctor_id=record.doctor_id,
            is_active=True,
        )
        db.add(cycle_user)

    db.flush()  # Ensure cycle_user.id is populated before commit

    # Mark token as used
    record.used = True
    db.commit()
    db.refresh(cycle_user)

    # Return JWT for automatic login
    access_token = create_access_token(
        data={
            "sub": cycle_user.email,
            "user_id": cycle_user.id,
            "user_type": "cycle_user",
            "doctor_id": cycle_user.doctor_id,
            "is_cycle_user": True,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": cycle_user.id,
            "email": cycle_user.email,
            "nombre_completo": cycle_user.nombre_completo,
            "is_cycle_user": True,
        }
    }


@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from app.core.config import settings
    
    doctor = get_user_by_email(db, request.email)
    if not doctor:
        # Return 200 anyway to prevent email enumeration
        return {"message": "Si el correo está registrado, se enviará un enlace de recuperación."}
    
    # Generate token
    token = secrets.token_urlsafe(32)
    doctor.reset_password_token = token
    doctor.reset_password_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()
    
    # Generate reset link
    reset_link = f"{settings.CORS_ORIGINS[0]}/admin/reset-password?token={token}"
    if len(settings.CORS_ORIGINS) > 2:
        # Try to use admin.arko360.net if available
        for origin in settings.CORS_ORIGINS:
            if 'admin' in origin:
                reset_link = f"{origin}/reset-password?token={token}"
                break
    
    # Send email
    background_tasks.add_task(
        send_reset_password_email,
        user_email=doctor.email,
        user_name=doctor.nombre_completo,
        reset_link=reset_link,
        logo_url=doctor.logo_url
    )
    
    return {"message": "Si el correo está registrado, se enviará un enlace de recuperación."}

@router.post("/reset-password")
async def reset_password(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    # Find doctor by token
    from app.db.models.doctor import Doctor
    doctor = db.query(Doctor).filter(Doctor.reset_password_token == request.token).first()
    
    if not doctor:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
        
    # Check expiration (make datetime timezone aware)
    if doctor.reset_password_expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace ha expirado")
        
    # Update password
    doctor.password_hash = hash_password(request.new_password)
    doctor.reset_password_token = None
    doctor.reset_password_expires = None
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}
