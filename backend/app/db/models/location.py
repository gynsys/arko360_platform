from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    google_maps_url = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    schedule = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)

    doctor = relationship("Doctor", back_populates="locations")
