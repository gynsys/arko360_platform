"""
Testimonial model - represents patient testimonials for doctors.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Testimonial(Base):
    """
    Testimonial model representing patient reviews/testimonials.
    """
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    
    # Patient information
    patient_name = Column(String, nullable=False)
    patient_email = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    
    # Testimonial content
    content = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    
    # Status
    is_approved = Column(Boolean, default=False)  # Doctor must approve testimonials
    is_featured = Column(Boolean, default=False)  # Featured testimonials appear first
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    doctor = relationship("Doctor", back_populates="testimonials")

