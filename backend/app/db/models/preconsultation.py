from sqlalchemy import Column, Integer, String, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class PreconsultationQuestion(Base):
    __tablename__ = "preconsultation_questions"

    id = Column(String, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    type = Column(String, nullable=False)  # text, number, boolean, select, multiselect, scale, date
    category = Column(String, nullable=False)  # general, medical_history, etc.
    required = Column(Boolean, default=False)
    options = Column(JSON, nullable=True)  # List of strings
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Multi-tenant link
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True) # Initially nullable for migration, then should be enforced
    doctor = relationship("Doctor", back_populates="preconsultation_questions")
