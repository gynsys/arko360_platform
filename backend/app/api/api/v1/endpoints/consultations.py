import os
import logging
import shutil
import uuid
from typing import List
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.schemas.consultation import ConsultationCreate, ConsultationUpdate, Consultation as ConsultationSchema
from app.schemas.consultation_asset import ConsultationAsset as ConsultationAssetSchema, ConsultationAssetCreate
from app.utils.pdf_generator import generate_medical_report, generate_summary_report
from app.db.base import get_db
from app.db.models.consultation import Consultation
from app.db.models.consultation_asset import ConsultationAsset
from app.db.models.appointment import Appointment
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user, get_tenant_id
from app.db.models.doctor import Doctor
from app.services.consultation_service import ConsultationService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/my-history")
def get_my_medical_history(
    db: Session = Depends(get_db)
) -> dict:
    """
    Returns the consultation_id for the authenticated CycleUser based on their email.
    The frontend uses this ID to open the history PDF.
    This endpoint reads the Authorization header manually to support both
    doctor and cycle_user tokens without a hard dependency that would break
    the public GET / endpoint.
    """
    from fastapi import Request
    raise HTTPException(status_code=404, detail="No history found")


# This route must come BEFORE the /{id}/... routes to avoid routing conflicts.
@router.get("/my-history-by-email")
def get_my_history_by_email(
    email: str,
    db: Session = Depends(get_db),
) -> dict:
    """
    Returns the consultation_id for the given patient email.
    Called from the frontend after the CycleUser is authenticated client-side.
    """
    # Find the most recent appointment with this email that has a patient_dni
    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.patient_email == email.lower().strip(),
            Appointment.patient_dni.isnot(None),
        )
        .order_by(Appointment.appointment_date.desc())
        .first()
    )

    if not appointment or not appointment.patient_dni:
        return {"consultation_id": None, "has_history": False}

    # Find the most recent consultation matching this patient's CI
    consultation = (
        db.query(Consultation)
        .filter(Consultation.patient_ci == appointment.patient_dni)
        .order_by(Consultation.created_at.desc())
        .first()
    )

    if not consultation:
        return {"consultation_id": None, "has_history": False}

    return {"consultation_id": consultation.id, "has_history": True}



@router.post("/")
async def create_consultation(
    consultation: ConsultationCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    try:
        # Security: Force doctor_id from current session/clinic
        db_consultation = ConsultationService.create(
            db=db,
            consultation_in=consultation,
            doctor_id=tenant_id
        )
    except Exception as e:
        logger.error(f"Database error creating consultation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al guardar la consulta.")

    return {
        "status": "success",
        "message": "Consultation saved",
        "consultation_id": db_consultation.id,
        "pdf_url": f"/api/v1/consultations/{db_consultation.id}/history_pdf",
        "pdf_report_url": f"/api/v1/consultations/{db_consultation.id}/pdf"
    }

from app.schemas.consultation import BotSyncPayload
from typing import Dict, Any

@router.post("/sync-bot")
async def sync_bot_consultation(
    payload: BotSyncPayload,
    db: Session = Depends(get_db)
):
    """
    Automated endpoint for Telegram Bot to sync new medical histories.
    Ingests raw preconsulta answers and creates a completed consultation.
    """
    try:
        # 1. Ensure an appointment exists for this data (to hold preconsulta_answers)
        # We look for a recent appointment for this CI to avoid duplication if bot retries
        appointment = db.query(Appointment).filter(
            Appointment.patient_dni == payload.ci,
            Appointment.status != "completed"
        ).order_by(Appointment.appointment_date.desc()).first()

        if not appointment:
            # Create a virtual appointment to hold the bot data
            from datetime import datetime
            appointment = Appointment(
                doctor_id=payload.doctor_id,
                patient_name=payload.full_name,
                patient_dni=payload.ci,
                patient_email=payload.email,
                patient_phone=payload.phone,
                appointment_date=datetime.now(),
                appointment_type="Bot Sync",
                status="completed",
                preconsulta_answers=payload.preconsulta_answers
            )
            db.add(appointment)
            db.commit()
            db.refresh(appointment)
        else:
            appointment.preconsulta_answers = payload.preconsulta_answers
            appointment.status = "completed"
            db.add(appointment)
            db.commit()

        # 2. Prepare Consultation data
        # We use inyectar_dinamicamente to build the summaries from the bot answers
        from app.services.summary_generator import GeneradorResumenes
        
        # Initial dictionary for injection
        report_data = {
            "full_name": payload.full_name,
            "ci": payload.ci,
            "age": payload.age,
            "phone": payload.phone,
            "address": payload.address,
            "occupation": payload.occupation,
            "email": payload.email,
            "reason_for_visit": payload.preconsulta_answers.get('reason_for_visit', 'Consulta desde Bot'),
            "family_history_mother": payload.preconsulta_answers.get('family_history_mother', 'No'),
            "family_history_father": payload.preconsulta_answers.get('family_history_father', 'No'),
            "personal_history": payload.preconsulta_answers.get('personal_history', 'No'),
            "supplements": payload.preconsulta_answers.get('supplements', 'No'),
            "surgical_history": payload.preconsulta_answers.get('surgical_history', 'No'),
            "appointment_id": appointment.id
        }

        # Inject summaries
        GeneradorResumenes.inyectar_dinamicamente(
            db=db,
            data=report_data,
            patient_ci=payload.ci,
            doctor_id=payload.doctor_id,
            patient_name=payload.full_name
        )

        # 3. Create the Consultation using existing Service
        # We need to map the dict back to ConsultationCreate schema
        consultation_in = ConsultationCreate(
            full_name=report_data["full_name"],
            ci=report_data["ci"],
            age=report_data["age"],
            phone=report_data["phone"],
            address=report_data["address"],
            occupation=report_data["occupation"],
            email=report_data["email"],
            reason_for_visit=report_data["reason_for_visit"],
            family_history_mother=report_data["family_history_mother"],
            family_history_father=report_data["family_history_father"],
            personal_history=report_data["personal_history"],
            supplements=report_data["supplements"],
            surgical_history=report_data["surgical_history"],
            summary_gyn_obstetric=report_data.get("summary_gyn_obstetric", "Cargado desde Bot"),
            summary_functional_exam=report_data.get("summary_functional_exam", "Cargado desde Bot"),
            summary_habits=report_data.get("summary_habits", "Cargado desde Bot"),
            admin_physical_exam="Evaluado vía Bot",
            admin_ultrasound=payload.preconsulta_answers.get('admin_ultrasound', 'No realizado'),
            admin_diagnosis=payload.preconsulta_answers.get('admin_diagnosis', 'Pendiente evaluación'),
            admin_plan=payload.preconsulta_answers.get('admin_plan', 'Seguimiento por App'),
            admin_observations="Registro sincronizado automáticamente desde Telegram Bot",
            appointment_id=appointment.id
        )

        db_consultation = ConsultationService.create(
            db=db,
            consultation_in=consultation_in,
            doctor_id=payload.doctor_id
        )

        return {
            "status": "success",
            "message": "History synced successfully",
            "consultation_id": db_consultation.id
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Sync error for bot consultation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al sincronizar historia.")

@router.get("/")
def get_consultations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0),
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Get all consultations for the authenticated doctor/clinic.
    """
    consultations = (
        db.query(Consultation)
        .filter(Consultation.doctor_id == tenant_id)
        .order_by(Consultation.created_at.desc()) # Retrieve the newest ones first
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Reverse list back to ascending order as expected by merge_consultations
    consultations = list(reversed(consultations))
    return ConsultationService.merge_consultations(db, consultations, newest_first=True)

@router.get("/patient/all", response_model=list)
def get_all_consultations_by_patient(
    dni: str,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Get ALL consultations for a specific patient (by DNI), ordered newest first.
    Used to display complete medical history in the consultation view.
    """
    consultations = db.query(Consultation).filter(
        Consultation.patient_ci == dni,
        Consultation.doctor_id == tenant_id
    ).order_by(Consultation.created_at.asc()).all()
    
    return ConsultationService.merge_consultations(db, consultations, newest_first=True)

@router.get("/patient/{dni}/raw", response_model=List[ConsultationSchema])
def get_raw_consultations_by_patient(
    dni: str,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Get ALL RAW consultations for a specific patient (by DNI), ordered newest first.
    No merging applied. Used for the frontend Report Explorer.
    """
    consultations = db.query(Consultation).filter(
        Consultation.patient_ci == dni,
        Consultation.doctor_id == tenant_id
    ).order_by(Consultation.created_at.desc()).all()
    
    return consultations
    

@router.get("/patient/latest", response_model=dict)
def get_latest_consultation_by_patient(
    dni: str,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Get the most recent consultation for a specific patient (by DNI).
    Used to display "Previous History" in the consultation view.
    """
    consultation = db.query(Consultation).filter(
        Consultation.patient_ci == dni,
        Consultation.doctor_id == tenant_id
    ).order_by(Consultation.created_at.desc()).first()

    if not consultation:
        return {}

    return {
        # Doctor Inputs (For History Card)
        "diagnosis": consultation.diagnosis,
        "plan": consultation.plan,
        "physical_exam": consultation.physical_exam,
        "observations": consultation.observations,
        "ultrasound": consultation.ultrasound,
        "created_at": consultation.created_at,

        # Patient & Summary Data (For Pre-filling)
        "patient_name": consultation.patient_name,
        "patient_ci": consultation.patient_ci,
        "patient_age": consultation.patient_age,
        "patient_phone": consultation.patient_phone,
        "reason_for_visit": consultation.reason_for_visit,
        "family_history_mother": consultation.family_history_mother,
        "family_history_father": consultation.family_history_father,
        "personal_history": consultation.personal_history,
        "supplements": consultation.supplements,
        "surgical_history": consultation.surgical_history,
        "obstetric_history_summary": consultation.obstetric_history_summary,
        "functional_exam_summary": consultation.functional_exam_summary,
        "habits_summary": consultation.habits_summary
    }

@router.post("/{consultation_id}/assets", response_model=ConsultationAssetSchema)
async def upload_consultation_asset(
    consultation_id: int,
    file: UploadFile = File(...),
    title: str = Form(None),
    description: str = Form(None),
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Limit by size if needed, assuming valid file
    upload_dir = Path(settings.UPLOAD_DIR) / "consultations" / str(consultation_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_filename

    # Save physical file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Failed to save consultation asset file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al guardar el archivo.")
        
    # Relative path for the URL
    relative_path = f"/uploads/consultations/{consultation_id}/{unique_filename}"

    # Database
    db_asset = ConsultationAsset(
        consultation_id=consultation_id,
        file_path=relative_path,
        file_name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=file_size,
        title=title,
        description=description
    )
    
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    return db_asset

@router.delete("/assets/{asset_id}")
def delete_consultation_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    asset = db.query(ConsultationAsset).filter(ConsultationAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Build absolute path from relative stored
    base_upload_dir = Path(settings.UPLOAD_DIR).parent # Settings returns `app/static/uploads` so parent is `app/static` depending on config. Let's fix resolution.
    
    # Safest way to delete without guessing path roots is using the standard structure:
    # `relative_path` is usually `/uploads/...` 
    file_path = Path(settings.UPLOAD_DIR).resolve().parent / asset.file_path.lstrip("/")
    
    try:
        if file_path.exists():
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"File physical delete failed for asset: {e}", exc_info=True)
        
    db.delete(asset)
    db.commit()
    
    return {"status": "success", "message": "Asset deleted successfully"}

@router.put("/{consultation_id}")
def update_consultation(
    consultation_id: int,
    consultation_update: ConsultationUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    db_consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.doctor_id == tenant_id
    ).first()
    if not db_consultation:
        raise HTTPException(status_code=404, detail="Consultation not found or not authorized")
    
    update_data = consultation_update.dict(exclude_unset=True)
    
    # Map schema fields to DB model fields if names differ
    # Schema: full_name -> DB: patient_name
    # Schema: ci -> DB: patient_ci
    # Schema: age -> DB: patient_age
    # Schema: phone -> DB: patient_phone
    # Schema: summary_gyn_obstetric -> DB: obstetric_history_summary
    # Schema: summary_functional_exam -> DB: functional_exam_summary
    # Schema: summary_habits -> DB: habits_summary
    # Schema: admin_physical_exam -> DB: physical_exam
    # Schema: admin_ultrasound -> DB: ultrasound
    # Schema: admin_diagnosis -> DB: diagnosis
    # Schema: admin_plan -> DB: plan
    # Schema: admin_observations -> DB: observations
    
    field_mapping = {
        "full_name": "patient_name",
        "ci": "patient_ci",
        "age": "patient_age",
        "phone": "patient_phone",
        "summary_gyn_obstetric": "obstetric_history_summary",
        "summary_functional_exam": "functional_exam_summary",
        "summary_habits": "habits_summary",
        "admin_physical_exam": "physical_exam",
        "admin_ultrasound": "ultrasound",
        "admin_diagnosis": "diagnosis",
        "admin_plan": "plan",
        "admin_observations": "observations"
    }

    for key, value in update_data.items():
        db_key = field_mapping.get(key, key)
        if hasattr(db_consultation, db_key):
            setattr(db_consultation, db_key, value)

    try:
        db.commit()
        db.refresh(db_consultation)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating consultation {consultation_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al actualizar la consulta.")

    return {"status": "success", "message": "Consultation updated", "consultation": db_consultation}

@router.post("/{consultation_id}/clone")
def clone_consultation(
    consultation_id: int,
    consultation_update: ConsultationUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Clones a consultation and applies updates. Used for 'Save As'.
    """
    new_consultation = ConsultationService.clone(
        db=db,
        consultation_id=consultation_id,
        consultation_update=consultation_update,
        doctor_id=tenant_id
    )
    
    if not new_consultation:
        raise HTTPException(status_code=404, detail="Consultation not found or unauthorized")
        
    return {
        "status": "success", 
        "message": "Consultation cloned and saved as new", 
        "consultation_id": new_consultation.id
    }

@router.delete("/{consultation_id}")
def delete_consultation(
    consultation_id: int,
    delete_all: bool = Query(False, description="If true, delete all consultations for this patient CI"),
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.doctor_id == tenant_id
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found or unauthorized")
    
    if delete_all and consultation.patient_ci:
        # Delete ALL consultations for this patient by this doctor
        db.query(Consultation).filter(
            Consultation.patient_ci == consultation.patient_ci,
            Consultation.doctor_id == tenant_id
        ).delete(synchronize_session=False)
    else:
        # Delete only this specific consultation
        db.delete(consultation)
        
    db.commit()
    return {"status": "success", "message": "History deleted" if delete_all else "Consultation deleted"}

@router.get("/{id}/pdf")
def get_consultation_pdf(
    id: int,
    include_images: bool = Query(False),
    use_color: bool = Query(False),
    include_watermark: bool = Query(True),
    report_at: str = Query(None),
    download: bool = Query(False),
    db: Session = Depends(get_db)
):
    consultation = db.query(Consultation).filter(Consultation.id == id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Map DB model to dictionary expected by PDF generator
    data = _map_consultation_to_data(consultation, db=db)
    data["include_images"] = include_images
    
    # Get assets for this consultation
    data["assets"] = [
        {
            "id": a.id,
            "file_path": a.file_path,
            "file_name": a.file_name,
            "file_type": a.file_type
        }
        for a in consultation.assets
    ]

    # Try to determine consultation_type from related appointment
    from datetime import timedelta
    appointment = db.query(Appointment).filter(
        Appointment.doctor_id == consultation.doctor_id,
        Appointment.patient_dni == consultation.patient_ci,
        Appointment.appointment_date >= (consultation.created_at - timedelta(days=2)),
        Appointment.appointment_date <= (consultation.created_at + timedelta(days=2))
    ).first()
    
    if appointment:
        data["consultation_type"] = appointment.appointment_type
    else:
        # Fallback if no appointment found
        data["consultation_type"] = "Ginecología"

    if report_at:
        data["report_at"] = report_at
    data["include_watermark"] = include_watermark

    # Generate PDF (Summary Report)
    pdf_buffer = generate_summary_report(data, consultation.doctor_id, db, use_color=use_color)
    
    headers = {}
    if download:
        safe_name = (consultation.patient_name or "report").replace(" ", "_")
        headers["Content-Disposition"] = f'attachment; filename="informe_{safe_name}.pdf"'
    
    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf", headers=headers)

@router.get("/{id}/history_data")
def get_consultation_history_data(
    id: int,
    db: Session = Depends(get_db)
):
    data = ConsultationService.get_history_data(db, id)
    if not data:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return data

@router.get("/{id}/data")
def get_consultation_report_data(
    id: int,
    db: Session = Depends(get_db)
):
    data = ConsultationService.get_consultation_data(db, id)
    if not data:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return data

@router.get("/{id}/history_pdf")
def get_consultation_history_pdf(
    id: int,
    use_color: bool = Query(False),
    include_watermark: bool = Query(True),
    report_at: str = Query(None),
    db: Session = Depends(get_db)
):
    # Use the service to get the data
    data = ConsultationService.get_history_data(db, id)
    if not data:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Pass toggle
    data["include_watermark"] = include_watermark
    if report_at:
        data["report_at"] = report_at

    # Generate PDF (Medical History with ALL consultations)
    pdf_buffer = generate_medical_report(data, data.get("doctor_id", id), db, use_color=use_color)
    
    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf")

@router.get("/{id}/history_image")
def get_consultation_history_image(
    id: int,
    db: Session = Depends(get_db)
):
    # Use the service to get the data
    data = ConsultationService.get_history_data(db, id)
    if not data:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Generate PDF (Medical History with ALL consultations)
    pdf_buffer = generate_medical_report(data, data.get("doctor_id", id), db)
    
    # Convert PDF to Image
    try:
        img_buffer = convert_pdf_to_image(pdf_buffer)
        return Response(content=img_buffer.getvalue(), media_type="image/png")
    except Exception as e:
        logger.error(f"Error generating history image for consultation {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al generar la imagen del reporte.")

from pydantic import BaseModel, EmailStr

class SendEmailRequest(BaseModel):
    email: EmailStr

@router.post("/{id}/send-email")
def send_consultation_email(
    id: int,
    email_data: SendEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    consultation = db.query(Consultation).filter(Consultation.id == id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Generate PDF in-memory to avoid self-request deadlock
    data = _map_consultation_to_data(consultation, db=db)
    pdf_buffer = generate_summary_report(data, consultation.doctor_id, db)
    pdf_bytes = pdf_buffer.getvalue()

    # URL for the report (still needed for the button)
    report_url = f"/api/v1/consultations/{consultation.id}/pdf"
    
    # Import task here to avoid circular imports if any
    from app.tasks.email_tasks import send_consultation_report_email
    
    background_tasks.add_task(
        send_consultation_report_email, 
        email=email_data.email, 
        patient_name=consultation.patient_name, 
        report_url=report_url,
        pdf_bytes=pdf_bytes
    )
    
    return {"status": "success", "message": "Email queued"}

def _map_consultation_to_data(consultation, db: Session = None):
    # --- DYNAMIC SUMMARY REGENERATION ---
    from app.services.summary_generator import GeneradorResumenes
    
    # Base data from DB
    data = {
        "full_name": consultation.patient_name,
        "ci": consultation.patient_ci,
        "age": consultation.patient_age,
        "phone": consultation.patient_phone,
        "reason_for_visit": consultation.reason_for_visit,
        "family_history_mother": consultation.family_history_mother,
        "family_history_father": consultation.family_history_father,
        "personal_history": consultation.personal_history,
        "supplements": consultation.supplements,
        "surgical_history": consultation.surgical_history,
        "summary_gyn_obstetric": consultation.obstetric_history_summary,
        "summary_functional_exam": consultation.functional_exam_summary,
        "summary_habits": consultation.habits_summary,
        "admin_physical_exam": consultation.physical_exam,
        "admin_ultrasound": consultation.ultrasound,
        "admin_diagnosis": consultation.diagnosis,
        "admin_plan": consultation.plan,
        "admin_observations": consultation.observations,
        "medical_report_content": consultation.medical_report_content,
        "history_number": consultation.history_number,
        "address": "", 
        "occupation": "",
        "created_at": consultation.created_at,
    }

    # Inject dynamic summaries (overwrites stale data if found)
    GeneradorResumenes.inyectar_dinamicamente(
        db=db,
        data=data,
        patient_ci=consultation.patient_ci,
        doctor_id=consultation.doctor_id,
        patient_name=consultation.patient_name
    )

    return data
