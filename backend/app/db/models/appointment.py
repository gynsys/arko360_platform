"""
Appointment model - represents patient appointments with doctors.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Appointment(Base):
    """
    Appointment model representing a scheduled appointment between a patient and a doctor.
    """
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to doctor (tenant / clinic)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    
    # Optional: which specific staff doctor is handling this appointment
    assigned_staff_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    
    # Patient information
    patient_name = Column(String, nullable=False)
    patient_email = Column(String, nullable=True)
    patient_phone = Column(String, nullable=True)
    
    # New fields for Preconsultation data capture
    occupation = Column(String, nullable=True)
    residence = Column(String, nullable=True)
    patient_dni = Column(String, nullable=True)
    patient_age = Column(Integer, nullable=True)
    
    # Appointment details
    appointment_date = Column(DateTime(timezone=True), nullable=False)
    appointment_type = Column(String, nullable=True)  # e.g., "Ginecológica", "Prenatal"
    reason_for_visit = Column(String, nullable=True)  # e.g., "Control Ginecológico", "Dolor pélvico"
    location = Column(String, nullable=True)          # Location/Branch name
    notes = Column(Text, nullable=True)
    
    # Status & Reminders
    status = Column(String, default="scheduled")  # scheduled, confirmed, cancelled, completed
    reminder_sent = Column(Boolean, default=False)
    
    # Pre-consultation Data
    preconsulta_answers = Column(JSON, nullable=True)  # JSON object of answers
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    doctor = relationship("Doctor", back_populates="appointments", foreign_keys=[doctor_id])
    assigned_staff = relationship("Doctor", back_populates="assigned_appointments", foreign_keys=[assigned_staff_id])

