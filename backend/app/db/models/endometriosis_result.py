from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class EndometriosisResult(Base):
    __tablename__ = "endometriosis_results"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    
    # Optional patient identification
    patient_identifier = Column(String, nullable=True) # e.g. "Anonymous" or email if logged in
    
    # Test detailed results
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, default=10, nullable=False)
    result_level = Column(String, nullable=False) # ALTA, MODERADA, BAJA
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    doctor = relationship("Doctor", back_populates="endometriosis_results")
