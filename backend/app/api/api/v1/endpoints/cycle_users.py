"""
API endpoints for cycle predictor users (patients).
Handles registration and authentication for end-users of the cycle predictor.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.cycle_user import CycleUser
from app.db.models.doctor import Doctor
from app.schemas.cycle_user import CycleUserCreate, CycleUserResponse, CycleUserUpdate
from app.schemas.token import Token, PasswordResetRequest, PasswordResetConfirm
from app.core.security import hash_password, create_access_token, verify_access_token, verify_password
from app.core.email import send_welcome_email
from app.tasks.email_tasks import send_cycle_user_reset_password_email, send_welcome_dual_task, send_cycle_user_verification_email
from app.services.notifications import trigger_immediate_evaluation
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")


def get_current_cycle_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> CycleUser:
    """Dependency to get current authenticated cycle user from token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_access_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    user_type: str = payload.get("user_type")
    
    if email is None or user_type != "cycle_user":
        raise credentials_exception
    
    user = db.query(CycleUser).filter(CycleUser.email == email).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


def validate_password_strength(password: str) -> None:
    """Validate password meets security requirements."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    # Opcional: agregar más validaciones (mayúsculas, números, etc.)


@router.post("/login", response_model=Token)
async def login_cycle_user(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    Login endpoint for cycle predictor users.
    Returns a JWT access token for authenticated users.
    """
    user = db.query(CycleUser).filter(CycleUser.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "user_type": "cycle_user",
            "doctor_id": user.doctor_id
        }
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_cycle_user(
    user_data: CycleUserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new cycle predictor user.
    User must provide a doctor_slug to associate with a specific doctor/tenant.
    """
    # Validar fortaleza de contraseña
    validate_password_strength(user_data.password)
    
    # Buscar doctor por slug si se proporciona
    doctor_id = None
    if user_data.doctor_slug:
        doctor = db.query(Doctor).filter(Doctor.slug_url == user_data.doctor_slug).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Verificar módulo habilitado
        if not hasattr(doctor, 'enabled_module_codes') or 'cycle_predictor' not in doctor.enabled_module_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cycle predictor is not available for this doctor"
            )
        doctor_id = doctor.id

    # Verificar email único (Case-Insensitive)
    email_lower = user_data.email.lower().strip()
    existing_user = db.query(CycleUser).filter(CycleUser.email == email_lower).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Crear usuario
    try:
        hashed_password = hash_password(user_data.password)
        verification_token = secrets.token_urlsafe(32)
        
        db_user = CycleUser(
            email=email_lower,
            password_hash=hashed_password,
            nombre_completo=user_data.nombre_completo,
            doctor_id=doctor_id,
            is_active=True,
            is_verified=False,
            verification_token=verification_token
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Registration Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user. Please try again."
        )
    
    # Generar token
    access_token = create_access_token(
        data={
            "sub": db_user.email,
            "user_id": db_user.id,
            "user_type": "cycle_user",
            "doctor_id": doctor_id
        }
    )
    
    # Deshabilitar auto-login tras registro si se prefiere que el usuario confirme algo,
    # pero aquí seguimos con el flujo actual que retorna el token directamente.
    
    # Enviar notificaciones de bienvenida (Email + Push) via Celery
    send_welcome_dual_task.delay(db_user.id, db_user.email, db_user.nombre_completo)
    
    # Enviar correo de verificación de cuenta de forma silenciosa
    # Nota: También se enviará cuando intenten agendar su segunda cita si no lo han hecho
    try:
        send_cycle_user_verification_email.delay(db_user.email, db_user.nombre_completo, db_user.verification_token)
    except Exception as verify_err:
        logger.error(f"Failed to queue verification email: {verify_err}")
    
    # Evaluar y programar notificaciones del día actual inmediatamente
    trigger_immediate_evaluation(db_user.id, db)
    
    return {"access_token": access_token, "token_type": "bearer"}


class VerifyEmailRequest(BaseModel):
    token: str

@router.post("/verify-email")
async def verify_email(
    request: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """Verify email address using token."""
    user = db.query(CycleUser).filter(CycleUser.verification_token == request.token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o cuenta ya verificada."
        )
        
    user.is_verified = True
    user.verification_token = None
    db.commit()
    
    return {"message": "Cuenta verificada exitosamente"}


@router.get("/me", response_model=CycleUserResponse)
async def get_current_cycle_user_info(
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """Get current authenticated cycle user."""
    return current_user


@router.put("/me", response_model=CycleUserResponse)
async def update_current_cycle_user(
    update_data: CycleUserUpdate,
    db: Session = Depends(get_db),
    current_user: CycleUser = Depends(get_current_cycle_user)
):
    """Update current authenticated cycle user details."""
    
    if update_data.nombre_completo is not None:
        current_user.nombre_completo = update_data.nombre_completo
        
    if update_data.email is not None and update_data.email != current_user.email:
        # Verificar email único
        exists = db.query(CycleUser).filter(
            CycleUser.email == update_data.email,
            CycleUser.id != current_user.id  # Excluir usuario actual
        ).first()
        if exists:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = update_data.email
        
    if update_data.cycle_avg_length is not None:
        current_user.cycle_avg_length = update_data.cycle_avg_length
        
    if update_data.period_avg_length is not None:
        current_user.period_avg_length = update_data.period_avg_length
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/password-recovery")
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset token for Cycle User.
    Always returns 200 to prevent email enumeration.
    """
    user = db.query(CycleUser).filter(CycleUser.email == request.email).first()
    
    if user:
        # NOTE: We are storing the token RAW to allow lookup by token in /reset-password
        # because we don't have a token_id field in the schema yet.
        # Ideally, we should add reset_token_id and hash the token.
        raw_token = secrets.token_urlsafe(32)
        
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        
        user.reset_password_token = raw_token
        user.reset_password_expires = expires
        db.commit()
        
        # Send email with raw token
        # Using .delay() for Celery task
        try:
            send_cycle_user_reset_password_email.delay(user.email, raw_token)
        except Exception as e:
            print(f"Error sending reset email: {e}")
    
    # Generic response
    return {"message": "If the email is registered, you will receive a reset link"}


@router.post("/reset-password")
async def reset_password(
    confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Reset password using token for Cycle User.
    """
    # Lookup by raw token
    user = db.query(CycleUser).filter(
        CycleUser.reset_password_token == confirm.token,
        CycleUser.reset_password_expires > datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    # Validate new password
    validate_password_strength(confirm.new_password)
        
    # Update password
    user.password_hash = hash_password(confirm.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()
    
    return {"message": "Password updated successfully"}


