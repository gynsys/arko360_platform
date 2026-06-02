"""
Consultation model - represents a medical consultation.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class Consultation(Base):
    """
    Consultation model representing a medical visit.
    Stores consolidated data from pre-consultation and doctor's exam.
    """
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    
    # Patient Snapshot Data
    patient_name = Column(String, nullable=True)
    patient_ci = Column(String, nullable=True)
    patient_age = Column(String, nullable=True)
    patient_phone = Column(String, nullable=True)
    patient_email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    
    # Pre-consultation Data
    reason_for_visit = Column(Text, nullable=True)
    family_history_mother = Column(Text, nullable=True)
    family_history_father = Column(Text, nullable=True)
    personal_history = Column(Text, nullable=True)
    supplements = Column(Text, nullable=True)
    surgical_history = Column(Text, nullable=True)
    obstetric_history_summary = Column(Text, nullable=True)
    functional_exam_summary = Column(Text, nullable=True)
    habits_summary = Column(Text, nullable=True)
    
    
    # Doctor Consultation Data
    physical_exam = Column(Text, nullable=True)
    ultrasound = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    observations = Column(Text, nullable=True)
    medical_report_content = Column(Text, nullable=True)
    
    # Metadata
    history_number = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="consultations")
    patient = relationship("Patient", back_populates="consultations")
    assets = relationship("ConsultationAsset", back_populates="consultation", cascade="all, delete-orphan")
