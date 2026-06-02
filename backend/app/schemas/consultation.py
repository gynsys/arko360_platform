from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.schemas.consultation_asset import ConsultationAsset

class ConsultationCreate(BaseModel):
    # Patient Info
    full_name: str
    ci: str
    age: str
    phone: str
    address: str
    occupation: str
    email: Optional[str] = None
    
    # Pre-consultation
    reason_for_visit: str
    family_history_mother: Optional[str] = None
    family_history_father: Optional[str] = None
    personal_history: Optional[str] = None
    supplements: Optional[str] = None
    surgical_history: Optional[str] = None
    summary_gyn_obstetric: Optional[str] = None
    summary_functional_exam: Optional[str] = None
    summary_habits: Optional[str] = None
    
    # Doctor Inputs
    admin_physical_exam: str
    admin_ultrasound: str
    admin_diagnosis: str
    admin_plan: str
    admin_observations: str
    medical_report_content: Optional[str] = None
    
    # Metadata
    doctor_id: int = 1
    history_number: Optional[str] = "N/A"
    appointment_id: Optional[int] = None

class ConsultationUpdate(BaseModel):
    full_name: Optional[str] = None
    ci: Optional[str] = None
    age: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    reason_for_visit: Optional[str] = None
    family_history_mother: Optional[str] = None
    family_history_father: Optional[str] = None
    personal_history: Optional[str] = None
    supplements: Optional[str] = None
    surgical_history: Optional[str] = None
    summary_gyn_obstetric: Optional[str] = None
    summary_functional_exam: Optional[str] = None
    summary_habits: Optional[str] = None
    admin_physical_exam: Optional[str] = None
    admin_ultrasound: Optional[str] = None
    admin_diagnosis: Optional[str] = None
    admin_plan: Optional[str] = None
    admin_observations: Optional[str] = None
    medical_report_content: Optional[str] = None
    history_number: Optional[str] = None

class ConsultationInDBBase(BaseModel):
    id: int
    doctor_id: int
    patient_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Patient Info
    patient_name: Optional[str] = None
    patient_ci: Optional[str] = None
    patient_age: Optional[str] = None
    patient_phone: Optional[str] = None
    
    # Fields
    reason_for_visit: Optional[str] = None
    family_history_mother: Optional[str] = None
    family_history_father: Optional[str] = None
    personal_history: Optional[str] = None
    supplements: Optional[str] = None
    surgical_history: Optional[str] = None
    
    # Summaries (Mapped in DB)
    obstetric_history_summary: Optional[str] = None
    functional_exam_summary: Optional[str] = None
    habits_summary: Optional[str] = None
    
    # Doctor Inputs
    physical_exam: Optional[str] = None
    ultrasound: Optional[str] = None
    diagnosis: Optional[str] = None
    plan: Optional[str] = None
    observations: Optional[str] = None
    medical_report_content: Optional[str] = None
    
    history_number: Optional[str] = None
    pdf_path: Optional[str] = None
    
    assets: List[ConsultationAsset] = []

    class Config:
        orm_mode = True

class BotSyncPayload(BaseModel):
    # Patient Info
    full_name: str
    ci: str
    age: str
    phone: str
    address: str = "No especificada"
    occupation: str = "No especificada"
    email: Optional[str] = None
    
    # Pre-consultation raw answers (Dict)
    preconsulta_answers: Dict[str, Any]
    
    # Doctor specific info (which doctor this belongs to)
    doctor_id: int = 1
    
    # Optional metadata
    appointment_id: Optional[int] = None
    created_at: Optional[datetime] = None

class Consultation(ConsultationInDBBase):
    pass
