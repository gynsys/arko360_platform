"""
Module model - represents system modules that can be enabled/disabled per tenant.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Module(Base):
    """
    Module model representing system features/modules.
    Examples: testimonials, faq, gallery, appointments, etc.
    """
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    code = Column(String, unique=True, index=True, nullable=False)  # e.g., 'testimonials', 'faq', 'gallery'

    # Module status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant_modules = relationship("TenantModule", back_populates="module")