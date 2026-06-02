from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.base import get_db
from app.db.models.appointment import Appointment
from app.db.models.cycle_user import CycleUser
import secrets
from app.tasks.email_tasks import send_cycle_user_verification_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class CheckPatientRequest(BaseModel):
    name: str
    dni: str

@router.post("/check-existence")
def check_patient_existence(
    data: CheckPatientRequest,
    db: Session = Depends(get_db)
):
    """
    Check if a patient exists by matching Name and DNI in past appointments.
    Also checks if the user's account is verified.
    """
    # Search by DNI only — the name field may still be empty when the user
    # tabs out of the DNI input, so we cannot rely on name for the lookup.
    appointment = db.query(Appointment).filter(
        Appointment.patient_dni == data.dni.strip()
    ).order_by(Appointment.id.desc()).first()
    
    if appointment:
        needs_verification = False
        if appointment.patient_email:
            cycle_user = db.query(CycleUser).filter(CycleUser.email == appointment.patient_email).first()
            # Count appointments for this email
            count = db.query(Appointment).filter(Appointment.patient_email == appointment.patient_email).count()
            
            if cycle_user and not cycle_user.is_verified and count >= 1:
                needs_verification = True
                # Reuse existing token if it exists to avoid invalidating previous link
                token_to_send = cycle_user.verification_token
                if not token_to_send:
                    token_to_send = secrets.token_urlsafe(32)
                    cycle_user.verification_token = token_to_send
                    db.commit()
                
                try:
                    send_cycle_user_verification_email.delay(
                        cycle_user.email, 
                        cycle_user.nombre_completo, 
                        token_to_send
                    )
                except Exception as e:
                    logger.error(f"Failed to auto-resend verification email on /check-existence: {e}")

        return {
            "exists": True,
            "needs_verification": needs_verification,
            "patient_data": {
                "patient_name": appointment.patient_name,
                "patient_dni": appointment.patient_dni,
                "patient_age": appointment.patient_age,
                "patient_phone": appointment.patient_phone,
                "patient_email": appointment.patient_email,
                "occupation": appointment.occupation,
                "residence": appointment.residence
            }
        }
    
    return {"exists": False}

@router.get("/by-email")
def get_patient_by_email(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Fetch the most recent patient data by their email address.
    Also checks if the user's account is verified to enforce 1-appointment grace period.
    """
    try:
        # Priority 1: Check CycleUser verification status
        email_lower = email.lower().strip()
        cycle_user = db.query(CycleUser).filter(CycleUser.email == email_lower).first()
        needs_verification = False
        
        # Priority 2: Get most recent appointment data
        appointments = db.query(Appointment).filter(
            Appointment.patient_email == email_lower
        ).order_by(Appointment.id.desc()).all()
        
        recent_appointment = appointments[0] if appointments else None
        
        if cycle_user and not cycle_user.is_verified and len(appointments) >= 1:
            needs_verification = True
            # Reuse existing token if it exists to avoid invalidating previous link
            token_to_send = cycle_user.verification_token
            if not token_to_send:
                token_to_send = secrets.token_urlsafe(32)
                cycle_user.verification_token = token_to_send
                db.commit()
                
            try:
                send_cycle_user_verification_email.delay(
                    cycle_user.email, 
                    cycle_user.nombre_completo, 
                    token_to_send
                )
            except Exception as e:
                logger.error(f"Failed to auto-resend verification email on /by-email: {e}")
                
        if recent_appointment:
            return {
                "exists": True,
                "needs_verification": needs_verification,
                "patient_data": {
                    "patient_name": recent_appointment.patient_name,
                    "patient_dni": recent_appointment.patient_dni,
                    "patient_age": recent_appointment.patient_age,
                    "patient_phone": recent_appointment.patient_phone,
                    "patient_email": recent_appointment.patient_email,
                    "occupation": recent_appointment.occupation,
                    "residence": recent_appointment.residence
                }
            }
        
        return {"exists": False}
    except Exception as e:
        logger.error(f"Error in get_patient_by_email: {e}", exc_info=True)
        raise e
