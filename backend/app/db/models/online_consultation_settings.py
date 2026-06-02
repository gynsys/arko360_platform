"""
Online Consultation Settings model - stores configuration for online consultations per doctor.
"""
from sqlalchemy import Column, Integer, Float, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.db.base import Base


class OnlineConsultationSettings(Base):
    """
    Configuration settings for online consultations per doctor.
    Stores pricing, payment methods, and availability.
    """
    __tablename__ = "online_consultation_settings"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to doctor
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, unique=True, index=True)
    
    # Pricing
    first_consultation_price = Column(Float, default=50.0, nullable=False)
    followup_price = Column(Float, default=40.0, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    
    # Payment methods (JSON array: ["zelle", "paypal", "bank_transfer", "mobile_payment"])
    payment_methods = Column(JSON, default=["zelle", "paypal", "bank_transfer"], nullable=False)
    
    # Available hours (JSON object: {"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]})
    # days: 0=Sunday, 1=Monday, ..., 6=Saturday
    available_hours = Column(JSON, default={"start": "09:00", "end": "17:00", "days": [1, 2, 3, 4, 5]}, nullable=False)
    
    # Additional settings
    session_duration_minutes = Column(Integer, default=45, nullable=False)  # Duration of online consultation
    is_active = Column(Boolean, default=True, nullable=False)  # Enable/disable online consultations
    video_url = Column(String, nullable=True)  # URL for marketing video
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    doctor = relationship("Doctor", back_populates="online_settings")
