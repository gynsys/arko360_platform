"""
LandingSite model - represents a cloned template/website sold to a client.
This is separate from the SaaS Tenant model.
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class LandingSiteStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    SUSPENDED = "suspended"

class LandingSite(Base):
    """
    LandingSite model representing a standalone landing page cloned from a template.
    """
    __tablename__ = "landing_sites"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    # Client info
    nombre_cliente = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    especialidad = Column(String, nullable=True)
    
    # Domain and Template configuration
    slug = Column(String, unique=True, index=True, nullable=False)
    custom_domain = Column(String, unique=True, index=True, nullable=True)
    template_name = Column(String, nullable=False, default="construccion")
    
    # Status
    status = Column(Enum(LandingSiteStatus), default=LandingSiteStatus.ACTIVE)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
