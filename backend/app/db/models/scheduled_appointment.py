from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class ScheduledAppointment(Base):
    """
    ScheduledAppointment model representing a follow-up appointment 
    suggested by the doctor during a consultation.
    """
    __tablename__ = "scheduled_appointments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    
    # Patient information (Snapshot for quick access)
    patient_ci = Column(String, index=True, nullable=False)
    patient_name = Column(String, nullable=False)
    patient_email = Column(String, nullable=True)
    patient_phone = Column(String, nullable=True)
    
    # Traceability
    original_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    original_consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=True)
    
    # Scheduling details
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    interval_type = Column(String, nullable=True) # e.g., '1_mes', '3_meses', '6_meses', '1_año'
    notes = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(String, default='pending') # pending, notified, completed, cancelled
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor")
    original_appointment = relationship("Appointment")
    original_consultation = relationship("Consultation")
