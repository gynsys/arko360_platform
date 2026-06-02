"""
FAQ model - represents frequently asked questions for doctors.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class FAQ(Base):
    """
    FAQ model representing frequently asked questions for doctors.
    """
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    
    # FAQ content
    question = Column(String, nullable=False)
    answer = Column(Text, nullable=False)
    
    # Display order
    display_order = Column(Integer, default=0)  # Lower numbers appear first
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    doctor = relationship("Doctor", back_populates="faqs")

