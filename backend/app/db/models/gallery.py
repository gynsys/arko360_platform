"""
Gallery model - represents images in doctor's gallery.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class GalleryImage(Base):
    """
    Gallery image model for doctor's promotional gallery.
    """
    __tablename__ = "gallery_images"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    
    # Image information
    image_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # Display order
    display_order = Column(Integer, default=0)  # For custom ordering
    
    # Status
    is_active = Column(Boolean, default=True)
    featured = Column(Boolean, default=False)  # Show in home slider
    
    # Crop data for positioning (stored as JSON: {x, y, width, height} in percentages)
    crop = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    doctor = relationship("Doctor", back_populates="gallery_images")

