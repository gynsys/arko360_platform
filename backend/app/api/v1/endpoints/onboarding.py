from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.patient import Patient
from app.db.models.appointment import Appointment
from app.db.models.preconsultation import PreconsultationQuestion as PQ
from app.db.models.cycle_user import CycleUser as CycleUserModel
from app.db.models.patient_activation_token import PatientActivationToken
from app.schemas.appointment import AppointmentCreate
from app.core.encryption import decrypt_text
from app.api.v1.endpoints.auth import get_current_user
from app.services.notifications.processor import trigger_doctor_event
from app.services.directory_service import sync_onboarding_to_directory
from app.tasks.email_tasks import send_platform_registration_invitation
from app.core.config import settings
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import logging
import secrets

logger = logging.getLogger(__name__)


router = APIRouter()

@router.get("/config/{slug}")
def get_onboarding_config(slug: str, db: Session = Depends(get_db)):
    """
    Public endpoint to get doctor configuration for onboarding.
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    return {
        "id": doctor.id,
        "slug_url": doctor.slug_url,
        "doctor_name": doctor.nombre_completo,
        "doctor_photo": doctor.photo_url or doctor.logo_url,
        "theme_primary_color": doctor.theme_primary_color or "#4F46E5",
        "specialty": doctor.especialidad,
        "pdf_config": doctor.pdf_config or {}
    }

@router.get("/questions/{slug}")
def get_onboarding_questions(slug: str, db: Session = Depends(get_db)):
    """
    Public endpoint to get pre-consultation questions by doctor slug.
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    questions = db.query(PQ).filter(PQ.doctor_id == doctor.id).order_by(PQ.order).all()
    
    # Decrypt
    results = []
    for q in questions:
        results.append({
            "id": q.id,
            "text": decrypt_text(q.text),
            "type": q.type,
            "category": q.category,
            "required": q.required,
            "options": [decrypt_text(opt) for opt in q.options] if q.options else [],
            "order": q.order
        })
        
    return results

@router.get("/appointment/{appointment_id}")
def get_public_appointment_data(appointment_id: int, db: Session = Depends(get_db)):
    """
    Public endpoint to get basic appointment data for pre-consultation seeding.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
    
    # Return ONLY what is needed for the chat seeding
    return {
        "id": appointment.id,
        "doctor_id": appointment.doctor_id,
        "doctor_slug": doctor.slug_url if doctor else None,
        "patient_name": appointment.patient_name,
        "patient_dni": appointment.patient_dni,
        "patient_age": appointment.patient_age,
        "patient_phone": appointment.patient_phone,
        "patient_email": appointment.patient_email,
        "residence": appointment.residence,
        "occupation": appointment.occupation,
        "appointment_type": appointment.appointment_type,
        "reason_for_visit": appointment.reason_for_visit,
        "location": appointment.location,
        "has_preconsulta": bool(appointment.preconsulta_answers)
    }

@router.post("/submit/{slug}")
def submit_unified_onboarding(
    slug: str, 
    payload: Dict[str, Any], 
    db: Session = Depends(get_db)
):
    """
    Unified submission for a new patient onboarding.
    Creates Patient, Appointment (Pending), and saves Preconsulta data.
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # 1. Extract Data from Nested Payload
    p_data = payload.get("patient_data", {})
    a_data = payload.get("appointment_data", {})
    appointment_id = payload.get("appointment_id")
    
    full_name = p_data.get("patient_name") or p_data.get("full_name")
    dni = p_data.get("patient_dni") or p_data.get("ci")
    phone = p_data.get("patient_phone") or p_data.get("phone")
    email = p_data.get("patient_email") or p_data.get("email")
    age = p_data.get("patient_age") or p_data.get("age")
    address = p_data.get("residence") or p_data.get("address")
    occupation = p_data.get("occupation")
    
    # Validation
    if not full_name or not dni:
        raise HTTPException(status_code=400, detail="Nombre y Cédula son obligatorios")
    
    # 2. Extract or Create Appointment
    existing_appointment = None
    if appointment_id:
        existing_appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == doctor.id
        ).first()

    if existing_appointment:
        # Update existing
        existing_appointment.patient_name = full_name
        existing_appointment.patient_dni = dni
        existing_appointment.patient_phone = phone
        existing_appointment.patient_email = email
        existing_appointment.patient_age = age
        existing_appointment.residence = address
        existing_appointment.occupation = occupation
        existing_appointment.preconsulta_answers = payload.get("answers", {})
        # Note: We don't change the scheduled date or location unless specifically asked,
        # usually pre-consultation is just for the medical data.
        target_appointment = existing_appointment
    else:
        # 3. Create NEW Appointment (Onboarding)
        app_date_str = a_data.get("appointment_date")
        app_date = datetime.now() # Fallback
        if app_date_str:
            try:
                # Handle ISO format "2026-03-24T14:00:00.000Z"
                app_date = datetime.fromisoformat(app_date_str.replace("Z", "+00:00"))
            except Exception as e:
                logger.warning(f"Error parsing date {app_date_str}: {e}")

        target_appointment = Appointment(
            doctor_id=doctor.id,
            patient_name=full_name,
            patient_dni=dni,
            patient_phone=phone,
            patient_email=email,
            patient_age=age,
            residence=address,
            occupation=occupation,
            appointment_type=a_data.get("appointment_type", "Consulta Médica (Onboarding)"),
            reason_for_visit=a_data.get("reason_for_visit", "Primer Interrogatorio Unificado"),
            location=a_data.get("location"),
            status="pending_confirmation",
            appointment_date=app_date,
            preconsulta_answers=payload.get("answers", {})
        )
        db.add(target_appointment)
    
    try:
        db.commit()
        db.refresh(target_appointment)
        
        # 3.5 Sync to Directory and Broadcast List
        try:
            sync_onboarding_to_directory(target_appointment, db)
        except Exception as e:
            logger.error(f"Error syncing to directory: {e}")
        
        # 4. Notify Doctor
        try:
            # Determine if it's a pre-consultation update (Short Path) or a full onboarding (Long Path)
            is_preconsulta_only = bool(existing_appointment)
            event_type = "preconsulta_completed" if is_preconsulta_only else "unified_onboarding"
            notif_type = "doctor_preconsulta_completed" if is_preconsulta_only else "doctor_unified_onboarding"
            
            date_str = target_appointment.appointment_date.strftime("%d/%m/%Y %H:%M") if target_appointment.appointment_date else "Fecha por definir"
            
            # Generate deterministic summaries
            try:
                from app.services.summary_generator import GeneradorResumenes
                answers = payload.get("answers", {})
                if answers:
                    gen = GeneradorResumenes(answers)
                    resumenes = gen.generar_todo(target_appointment.patient_name)
                else:
                    resumenes = {k: "Sin información registrada." for k in ["general", "antecedentes", "gineco", "funcional", "estilo_vida"]}
            except Exception as e:
                logger.error(f"Error generating summaries in onboarding: {e}")
                resumenes = {k: "Error al generar resumen." for k in ["general", "antecedentes", "gineco", "funcional", "estilo_vida"]}

            summary_personal = f"<p>{resumenes.get('general', '')}</p><p>{resumenes.get('antecedentes', '')}</p>"
            summary_gineco = f"<p>{resumenes.get('gineco', 'Sin datos.')}</p>"
            summary_funcional = f"<p>{resumenes.get('funcional', 'Sin hallazgos.')}</p>"
            summary_habitos = f"<p>{resumenes.get('estilo_vida', 'Sin datos.')}</p>"

            trigger_doctor_event(
                doctor_id=doctor.id,
                notification_type=notif_type,
                context={
                    "event": event_type,
                    "doctor_name": doctor.nombre_completo,
                    "patient_name": target_appointment.patient_name,
                    "appointment_date": date_str,
                    "appointment_type": target_appointment.appointment_type,
                    "reason": target_appointment.reason_for_visit,
                    "phone": target_appointment.patient_phone,
                    "summary_html": "<p><em>El paciente ha completado su formulario a través del enlace web. Puedes ver sus respuestas detalladas ingresando al sistema.</em></p>",
                    "summary_personal": summary_personal,
                    "summary_gineco": summary_gineco,
                    "summary_funcional": summary_funcional,
                    "summary_habitos": summary_habitos
                },
                db=db
            )

        except Exception as e:
            logger.error(f"Error triggering unified onboarding notification: {e}")

        # 5. Invite Patient to Register (If email provided and not registered)
        if email:
            try:
                # Check if already registered
                already_registered = db.query(CycleUserModel).filter(
                    CycleUserModel.email == email.lower().strip()
                ).first()

                if not already_registered:
                    # Generate a 48-hour registration token
                    reg_token = secrets.token_urlsafe(48)
                    reg_token_record = PatientActivationToken(
                        email=email.lower().strip(),
                        token=reg_token,
                        doctor_id=doctor.id,
                        appointment_id=target_appointment.id,
                        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
                    )
                    db.add(reg_token_record)
                    db.commit()
                    
                    registration_link = f"{settings.FRONTEND_URL}/activar-cuenta?token={reg_token}"

                    send_platform_registration_invitation.delay(
                        patient_email=email,
                        patient_name=full_name,
                        doctor_name=doctor.nombre_completo,
                        registration_link=registration_link,
                    )
            except Exception as e:
                logger.error(f"Error sending platform invitation: {e}")

        # 6. Success response
        return {
            "status": "success",
            "appointment_id": target_appointment.id,
            "message": "Onboarding completado exitosamente"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving unified onboarding: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al procesar el registro")
