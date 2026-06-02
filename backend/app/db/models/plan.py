"""
Plan model - represents subscription plans for tenants.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, DECIMAL, JSON
from sqlalchemy.sql import func
from app.db.base import Base


class Plan(Base):
    """
    Plan model representing subscription plans.
    Each plan defines what features/modules are available and pricing.
    """
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(DECIMAL(10, 2), nullable=True)  # Monthly price

    # Features included in this plan (JSON structure)
    features = Column(JSON, nullable=True, default=dict)

    # Limits for different modules
    max_testimonials = Column(Integer, default=10)
    max_gallery_images = Column(Integer, default=20)
    max_faqs = Column(Integer, default=15)
    max_staff_members = Column(Integer, default=0)  # 0 means independent doctor, >0 means institutional clinic


    # Advanced features
    custom_domain = Column(Boolean, default=False)
    analytics_dashboard = Column(Boolean, default=False)
    priority_support = Column(Boolean, default=False)

    # Plan status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())