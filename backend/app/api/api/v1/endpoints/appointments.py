"""
Appointment endpoints for managing appointments.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Union

from app.core.config import settings
from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.appointment import Appointment
from app.schemas.appointment import AppointmentInDB, AppointmentUpdate, AppointmentCreate, AppointmentList
from app.api.v1.endpoints.auth import get_current_user, get_tenant_id
from app.cycle_predictor.router import get_current_actor
from app.db.models.cycle_user import CycleUser
from app.tasks.email_tasks import send_appointment_notification_email, send_appointment_status_update, send_preconsulta_completed_notification, send_platform_registration_invitation
from app.services.notifications import trigger_doctor_event
# ClinicalSummaryGenerator removed (Legacy)
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()

def _trigger_patient_appointment_notifications(db: Session, appointment: Appointment, doctor: Doctor):
    """
    Centralized helper to send status-based emails to patients.
    Currently handles 'confirmed' and 'cancelled' statuses.
    Includes logic for pre-consultation link based on patient recurrence.
    """
    if appointment.status not in ["confirmed", "cancelled", "paid"]:
        return

    # Map 'paid' to 'confirmed' for email template purposes
    email_status = "confirmed" if appointment.status in ["confirmed", "paid"] else appointment.status
    
    # Check for recurrence logic
    is_recurrent = False

    # Check 1: Current appointment already has answers
    if appointment.preconsulta_answers:
        if isinstance(appointment.preconsulta_answers, str):
            if len(appointment.preconsulta_answers.strip()) > 5:
                is_recurrent = True
        elif len(appointment.preconsulta_answers) > 0:
                is_recurrent = True

    # Check 2: History with same doctor
    if not is_recurrent and appointment.patient_dni:
        has_previous_answers = db.query(Appointment).filter(
            Appointment.patient_dni == appointment.patient_dni,
            Appointment.doctor_id == appointment.doctor_id,
            Appointment.id != appointment.id,
            Appointment.preconsulta_answers.is_not(None)
        ).first()
        
        if has_previous_answers:
            prev_answers = has_previous_answers.preconsulta_answers
            if isinstance(prev_answers, str):
                if len(prev_answers.strip()) > 5:
                    is_recurrent = True
            elif prev_answers and len(prev_answers) > 0:
                is_recurrent = True

    # Generate preconsulta link ONLY if NOT recurrent
    preconsulta_link = None
    if not is_recurrent and email_status == "confirmed":
        slug = doctor.slug_url or "doctor"
        preconsulta_link = f"{settings.FRONTEND_URL}/{slug}/preconsulta?appointment_id={appointment.id}"
    
    # Format date safely
    date_str = appointment.appointment_date.strftime("%d/%m/%Y %H:%M") if appointment.appointment_date else "Fecha por definir"

    if appointment.patient_email:
        try:
            send_appointment_status_update.delay(
                patient_email=appointment.patient_email,
                patient_name=appointment.patient_name,
                status=email_status,
                appointment_date=date_str,
                doctor_name=doctor.nombre_completo,
                preconsulta_link=preconsulta_link,
            )
        except Exception as e:
            logger.error(f"Error triggering patient notification task: {e}")

@router.get("/public/booked-times")
async def get_booked_times(
    doctor_id: int,
    date: str,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get booked time slots for a specific doctor, date, and optionally a location (sede).
    Filtering by location is critical to avoid showing slots from other sedes as occupied.
    Returns ISO strings so the frontend can correctly parse them into local time.
    """
    try:
        from datetime import datetime, time, timedelta, timezone
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        
        # Fetch loosely (-1 to +1 days) to account for UTC timezone shifts
        start_dt = datetime.combine(target_date - timedelta(days=1), time.min)
        end_dt = datetime.combine(target_date + timedelta(days=1), time.max)
        
        query = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
            Appointment.status.in_(["scheduled", "confirmed", "paid", "pending"])
        )

        # If a specific sede is provided, only count appointments for that location
        if location:
            query = query.filter(Appointment.location == location)
        
        appts = query.all()
        
        slots = []
        for app in appts:
            if app.appointment_date:
                dt = app.appointment_date
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                slots.append(dt.isoformat())
                
        return slots
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")


from app.core.limiter import limiter

@router.post("/public", response_model=AppointmentInDB, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_public_appointment(
    request: Request,
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new appointment (public endpoint for patients).
    Patients can create appointments without authentication.
    """
    # Verify that the doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == appointment_data.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialista no encontrado."
        )
    
    if not doctor.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El especialista no está recibiendo citas en este momento."
        )
        
    # Check if patient is registered and enforce 1-appointment verification grace period
    from app.db.models.cycle_user import CycleUser
    import secrets
    from app.tasks.email_tasks import send_cycle_user_verification_email
    
    email_lower = appointment_data.patient_email.lower().strip() if appointment_data.patient_email else None
    if email_lower:
        cycle_user = db.query(CycleUser).filter(CycleUser.email == email_lower).first()
        if cycle_user and not cycle_user.is_verified:
            appointment_count = db.query(Appointment).filter(
                Appointment.patient_email == email_lower
            ).count()
            
            if appointment_count >= 1:
                # Generate new token and resend verification email automatically
                new_token = secrets.token_urlsafe(32)
                cycle_user.verification_token = new_token
                db.commit()
                
                try:
                    send_cycle_user_verification_email.delay(
                        cycle_user.email, 
                        cycle_user.nombre_completo, 
                        new_token
                    )
                except Exception as e:
                    logger.error(f"Failed to auto-resend verification email: {e}")
                    
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="unverified_second_appointment"
                )
    
    # Check for double booking: same doctor + same location + same time window (±1 min).
    # We use a range instead of exact equality to avoid timezone-naive vs timezone-aware
    # comparison failures that silently pass the == check in PostgreSQL.
    from datetime import timedelta
    appt_dt = appointment_data.appointment_date
    # Ensure we work with a naive UTC datetime for the comparison window
    if hasattr(appt_dt, 'tzinfo') and appt_dt.tzinfo is not None:
        from datetime import timezone as _tz
        appt_dt_naive = appt_dt.astimezone(_tz.utc).replace(tzinfo=None)
    else:
        appt_dt_naive = appt_dt

    window_start = appt_dt_naive - timedelta(minutes=1)
    window_end   = appt_dt_naive + timedelta(minutes=1)

    double_booking_query = db.query(Appointment).filter(
        Appointment.doctor_id == appointment_data.doctor_id,
        Appointment.appointment_date >= window_start,
        Appointment.appointment_date <= window_end,
        Appointment.status.in_(["scheduled", "confirmed", "paid", "pending"])
    )
    # Scope conflict check to the same sede only
    if appointment_data.location:
        double_booking_query = double_booking_query.filter(
            Appointment.location == appointment_data.location
        )
    existing_appointment = double_booking_query.first()

    if existing_appointment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El horario seleccionado ya no está disponible. Por favor, elige otro bloque."
        )

    
    db_appointment = Appointment(**appointment_data.model_dump())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    # Send notification to doctor (centralized system)
    try:
        date_str = db_appointment.appointment_date.strftime("%d/%m/%Y %H:%M") if db_appointment.appointment_date else "Fecha por definir"
        
        # Distinguish between regular and online consultations
        notif_type = "doctor_new_appointment"
        if db_appointment.appointment_type == "Consulta Online":
            notif_type = "doctor_new_online_consultation"

        trigger_doctor_event(
            doctor_id=doctor.id,
            notification_type=notif_type,
            context={
                "event": notif_type.replace("doctor_", ""),
                "doctor_name": doctor.nombre_completo,
                "patient_name": db_appointment.patient_name,
                "appointment_date": date_str,
                "appointment_type": db_appointment.appointment_type or "No especificado",
                "reason": db_appointment.reason_for_visit or "No especificado",
                "phone": db_appointment.patient_phone or "No especificado"
            },
            db=db
        )
    except Exception as e:
        logger.error(f"Error triggering doctor notification for new appointment: {e}")
    
    # NEW: Trigger patient confirmation email if born confirmed (e.g. PayPal)
    if db_appointment.status in ["confirmed", "paid"]:
        _trigger_patient_appointment_notifications(db, db_appointment, doctor)
    
    return db_appointment


@router.post("/", response_model=AppointmentInDB, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    """
    Create a new appointment.
    Only staff or clinic admin can create appointments for the clinic.
    """
    # Verify that the appointment is for the clinic
    if appointment_data.doctor_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes crear citas para otro especialista o clínica."
        )
    
    # Check for double booking (exact match of timestamp)
    existing_appointment = db.query(Appointment).filter(
        Appointment.doctor_id == appointment_data.doctor_id,
        Appointment.appointment_date == appointment_data.appointment_date,
        Appointment.status.in_(["scheduled", "confirmed", "paid", "pending"])
    ).first()
    
    if existing_appointment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El horario seleccionado ya no está disponible. Por favor, elige otro bloque."
        )
    
    db_appointment = Appointment(**appointment_data.model_dump())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    # NEW: Trigger patient confirmation email if born confirmed
    if db_appointment.status in ["confirmed", "paid"]:
        _trigger_patient_appointment_notifications(db, db_appointment, current_user)
        
    return db_appointment


@router.get("/", response_model=List[Union[AppointmentInDB, AppointmentList]])
async def get_appointments(
    current_actor: Annotated[Union[Doctor, CycleUser], Depends(get_current_actor)],
    db: Session = Depends(get_db),
    full: bool = False
):
    """
    Get appointments for the current actor.
    If full=True: returns all fields including preconsulta_answers and performs dynamic summary injection.
    If full=False (default): returns lightweight objects for lists/calendar.
    """
    if isinstance(current_actor, Doctor):
        # Resolve tenant_id for the current actor manually since we can't use Depends easily here
        tenant_id = getattr(current_actor, 'clinic_id', None) or current_actor.id
        query = db.query(Appointment).filter(
            Appointment.doctor_id == tenant_id
        )
        # If it's a staff member, ONLY show their assigned appointments
        if getattr(current_actor, 'role', '') == 'staff':
            query = query.filter(Appointment.assigned_staff_id == current_actor.id)
    else:
        query = db.query(Appointment).filter(
            (Appointment.patient_email == current_actor.email) | 
            (Appointment.patient_dni == current_actor.ci)
        )
    
    # Sort by date descending to keep recent ones first
    appointments = query.order_by(Appointment.appointment_date.desc()).all()

    if not full:
        return appointments

    # --- DYNAMIC SUMMARY INJECTION (Only if full=True) ---
    from app.services.summary_generator import GeneradorResumenes
    for app in appointments:
        if app.preconsulta_answers:
            try:
                if isinstance(app.preconsulta_answers, str):
                    answers = json.loads(app.preconsulta_answers)
                else:
                    answers = app.preconsulta_answers or {}
                
                GeneradorResumenes.inyectar_dinamicamente(
                    db=db,
                    data=answers,
                    patient_name=app.patient_name,
                    appointment=app
                )
                app.preconsulta_answers = json.dumps(answers)
            except Exception as e:
                logger.warning(f"Failed to inject dynamic summary for appointment {app.id}: {e}", exc_info=True)
                continue

    return appointments


@router.get("/{appointment_id}", response_model=AppointmentInDB)
async def get_appointment(
    appointment_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    """
    Get a specific appointment by ID.
    Includes dynamically generated summaries if preconsulta answers exist.
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == tenant_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
        
    if getattr(current_user, 'role', '') == 'staff' and appointment.assigned_staff_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver esta cita."
        )
    
    # --- DYNAMIC SUMMARY INJECTION ---
    # We create a dictionary to inject data, then update the DB object's transient field
    try:
        from app.services.summary_generator import GeneradorResumenes
        
        # Parse existing answers to work on them
        if isinstance(appointment.preconsulta_answers, str):
            answers = json.loads(appointment.preconsulta_answers)
        else:
            answers = appointment.preconsulta_answers or {}
        
        # Inject dynamic summaries into the 'answers' dict
        GeneradorResumenes.inyectar_dinamicamente(
            db=db,
            data=answers,
            patient_ci=appointment.patient_dni,
            doctor_id=appointment.doctor_id,
            patient_name=appointment.patient_name
        )
        
        # Update the object with the enriched answers (serializes back to JSON string)
        appointment.preconsulta_answers = json.dumps(answers)
    except Exception as e:
        logger.error(f"Error injecting dynamic summaries in get_appointment: {e}")
    
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentInDB)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    """
    Update an appointment.
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == tenant_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
        
    if getattr(current_user, 'role', '') == 'staff' and appointment.assigned_staff_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar esta cita."
        )
    
    # Check for status change
    old_status = appointment.status

    # Update fields
    update_data = appointment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    
    # Send email if status changed
    if "status" in update_data and update_data["status"] != old_status:
        _trigger_patient_appointment_notifications(db, appointment, current_user)

    return appointment



@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    """
    Delete an appointment.
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == tenant_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
        
    if getattr(current_user, 'role', '') == 'staff' and appointment.assigned_staff_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta cita."
        )
    
    db.delete(appointment)
    db.commit()
    
    return None


@router.post("/{appointment_id}/preconsulta", status_code=status.HTTP_200_OK)
async def submit_preconsulta(
    appointment_id: int,
    answers: dict,
    db: Session = Depends(get_db)
):
    """
    Submit preconsulta answers for an appointment.
    Public endpoint (secured by appointment ID knowledge).
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    print(f"--- SUBMIT PRECONSULTA ---")
    print(f"ID: {appointment_id}")
    print(f"Received {len(answers)} answers.")
    print(f"Patient Name in Answers: {answers.get('full_name', 'Unknown')}")
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Save answers as JSON string
    appointment.preconsulta_answers = json.dumps(answers)
    # Update status if it was just scheduled/confirmed
    if appointment.status in ["scheduled", "confirmed"]:
        appointment.status = "preconsulta_completed"
        
    db.commit()
    
    # Notify doctor
    try:
        doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
        if doctor:
            # Generate Clinical Summary for Email
            # Generate Clinical Summary for Email
            summary_html = None
            try:
                # ADAPTING DATA FOR GENERATOR
                formatted_answers = []
                # fetch questions to map keys to text
                from app.crud import preconsultation as crud_preconsulta
                all_questions = crud_preconsulta.get_questions(db, doctor_id=appointment.doctor_id, limit=200)
                q_map = {str(q.id): q for q in all_questions}
                
                readable_map = {}
                formatted_answers = []

                for key, val in answers.items():
                    # key might be ID or variable name
                    # If ID is in map
                    q_text = ""
                    qid = key
                    if key in q_map:
                        q_text = q_map[key].text
                        # Build readable map (Snapshotted text)
                        if q_text:
                            readable_map[q_text] = val
                    
                    # Mock answer object for generator
                    formatted_answers.append({
                        "question_id": qid,
                        "text_value": val,
                        "question": {"text": q_text}
                    })

                # Pass template_data to enable Narrative Generator
                template_data = []
                for q in all_questions:
                    template_data.append({
                        "id": q.id,
                        "text": q.text,
                        "type": q.type,
                        "category": q.category,
                        "options": q.options,
                        "order": q.order
                    })

                # Map to legacy keys for frontend display (DoctorConsultationPage.jsx)
                for q in all_questions:
                    q_text_lower = q.text.lower()
                    q_id = str(q.id)
                    if q_id in answers:
                        val = answers[q_id]
                        if any(kw in q_text_lower for kw in ['fuma', 'tabaco', 'smoking']):
                            answers['habits_smoking'] = val
                        elif any(kw in q_text_lower for kw in ['alcohol', 'bebidas']):
                            answers['habits_alcohol'] = val
                        elif any(kw in q_text_lower for kw in ['actividad física', 'ejercicio']):
                            answers['habits_physical_activity'] = val
                        elif any(kw in q_text_lower for kw in ['sustancia', 'droga']):
                            answers['habits_substance_use'] = val

                # Use GeneradorResumenes for notification email
                from app.services.summary_generator import GeneradorResumenes
                gen = GeneradorResumenes(answers)
                resumenes = gen.generar_todo(appointment.patient_name)
                
                # We still keep summary_html for backwards compatibility
                summary_html = f"<p>{resumenes['general']}</p><p>{resumenes['antecedentes']}</p><p>{resumenes['gineco']}</p><p>{resumenes['funcional']}</p><p>{resumenes['estilo_vida']}</p>"

                # But we add individual summaries for the new beautiful email template
                summary_personal = f"<p>{resumenes['general']}</p><p>{resumenes['antecedentes']}</p>"
                summary_gineco = f"<p>{resumenes['gineco']}</p>" if resumenes.get('gineco') else "Sin datos registrados."
                summary_funcional = f"<p>{resumenes['funcional']}</p>" if resumenes.get('funcional') else "Sin hallazgos reportados."
                summary_habitos = f"<p>{resumenes['estilo_vida']}</p>" if resumenes.get('estilo_vida') else "Sin datos registrados."

                # SAVE DYNAMIC DATA ONLY: Human Readable Snapshot
                # NO GUARDAMOS los resúmenes de texto (summary_...) para que siempre se generen dinámicamente
                answers['_human_readable'] = readable_map
                
                # Re-save updated answers to DB (raw data + human readable)
                appointment.preconsulta_answers = json.dumps(answers)
                db.commit()
            except Exception as e:
                print(f"Error generating summary context: {e}")
                # Continue without summary
                summary_html = None
                summary_personal = "Error al generar resumen."
                summary_gineco = "Error al generar resumen."
                summary_funcional = "Error al generar resumen."
                summary_habitos = "Error al generar resumen."

            # Backfill missing data from Appointment Record (Dashboard Logic)
            merged_data = answers.copy()
            if not merged_data.get('ci'): merged_data['ci'] = appointment.patient_dni
            if not merged_data.get('age'): merged_data['age'] = appointment.patient_age
            if not merged_data.get('email'): merged_data['email'] = appointment.patient_email
            if not merged_data.get('phone'): merged_data['phone'] = appointment.patient_phone
            if not merged_data.get('full_name'): merged_data['full_name'] = appointment.patient_name
            
            # Reason logic priority
            if not merged_data.get('reason_for_visit') and not merged_data.get('gyn_reason'):
                 merged_data['reason_for_visit'] = appointment.reason_for_visit
            
            date_str = appointment.appointment_date.strftime("%d/%m/%Y %H:%M") if appointment.appointment_date else "Fecha por definir"

            trigger_doctor_event(
                doctor_id=doctor.id,
                notification_type="doctor_preconsulta_completed",
                context={
                    "event": "preconsulta_completed",
                    "doctor_name": doctor.nombre_completo,
                    "patient_name": appointment.patient_name,
                    "appointment_date": date_str,
                    "patient_data": merged_data,
                    "summary_html": summary_html,
                    "summary_personal": summary_personal,
                    "summary_gineco": summary_gineco,
                    "summary_funcional": summary_funcional,
                    "summary_habitos": summary_habitos
                },
                db=db
            )

            # Correo 2: Invitar a la paciente a registrarse en la plataforma
            # Solo si la paciente tiene email y aún no tiene una cuenta registrada
            if appointment.patient_email:
                try:
                    import secrets
                    from datetime import timezone
                    from app.db.models.patient_activation_token import PatientActivationToken
                    from app.db.models.cycle_user import CycleUser as CycleUserModel

                    # Check if the patient already has an account
                    already_registered = db.query(CycleUserModel).filter(
                        CycleUserModel.email == appointment.patient_email
                    ).first()

                    if not already_registered:
                        # Generate a new 48-hour registration token
                        reg_token = secrets.token_urlsafe(48)
                        reg_token_record = PatientActivationToken(
                            email=appointment.patient_email,
                            token=reg_token,
                            doctor_id=appointment.doctor_id,
                            appointment_id=appointment.id,
                            expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
                        )
                        db.add(reg_token_record)
                        db.commit()
                        registration_link = f"{settings.FRONTEND_URL}/activar-cuenta?token={reg_token}"

                        send_platform_registration_invitation.delay(
                            patient_email=appointment.patient_email,
                            patient_name=appointment.patient_name,
                            doctor_name=doctor.nombre_completo,
                            registration_link=registration_link,
                        )
                except Exception as reg_err:
                    logger.error(f"Error sending registration invitation for appointment {appointment_id}: {reg_err}", exc_info=True)
    except Exception as e:
        logger.error(f"Error in preconsulta notification pipeline for appointment {appointment_id}: {e}", exc_info=True)
    
    return {"status": "success", "message": "Preconsulta saved"}

