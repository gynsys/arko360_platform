"""
TenantModule model - represents the many-to-many relationship between tenants and modules.
"""
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class TenantModule(Base):
    """
    TenantModule model representing which modules are enabled for each tenant.
    This creates a many-to-many relationship between tenants and modules.
    """
    __tablename__ = "tenant_modules"

    tenant_id = Column(Integer, ForeignKey("doctors.id"), primary_key=True)
    module_id = Column(Integer, ForeignKey("modules.id"), primary_key=True)

    # Whether this module is enabled for this tenant
    is_enabled = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant = relationship("Doctor", back_populates="tenant_modules")
    module = relationship("Module", back_populates="tenant_modules")