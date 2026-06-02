from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class ConsultationAsset(Base):
    """
    Model for storing medical history assets like images, videos, and PDFs (MRIs, ultrasounds, etc.)
    associated with a specific consultation/preconsultation.
    """
    __tablename__ = "consultation_assets"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False)
    
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # e.g., 'image/jpeg', 'video/mp4', 'application/pdf'
    file_size_bytes = Column(Integer, nullable=True)
    
    # Metadata for the UI/doctor
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    consultation = relationship("Consultation", back_populates="assets")
