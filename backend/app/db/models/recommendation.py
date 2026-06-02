from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.db.base import Base

class RecommendationCategory(Base):
    __tablename__ = "recommendation_categories"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)  # Tenant scoping
    name = Column(String, nullable=False)
    
    # Relationships
    items = relationship("Recommendation", back_populates="category", cascade="all, delete-orphan")
    tenant = relationship("Doctor", backref="recommendation_categories")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("recommendation_categories.id"), nullable=True) # Nullable for "General"
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    
    action_type = Column(String, default="LINK") # 'LINK' or 'PAYPAL'
    action_url = Column(String, nullable=True)
    price = Column(String, nullable=True) # Free-text for flexibility (e.g. "$15.00", "Gratis")
    
    is_active = Column(Boolean, default=True)
    
    # Relationships
    category = relationship("RecommendationCategory", back_populates="items")
    tenant = relationship("Doctor", back_populates="recommendations")
