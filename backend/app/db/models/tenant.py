"""
Tenant model - represents tenants (doctors) in the multi-tenant system.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class TenantStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    SUSPENDED = "suspended"


class Tenant(Base):
    """
    Tenant model representing a medical professional in the multi-tenant system.
    This extends the Doctor model with administrative fields.
    """
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for Google OAuth users

    # Profile information
    nombre_completo = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    especialidad = Column(String, nullable=True)
    biografia = Column(String, nullable=True)

    # Multi-tenant URL identifier
    slug = Column(String, unique=True, index=True, nullable=False)

    # Customization fields
    logo_url = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)  # Doctor's profile photo
    theme_primary_color = Column(String, nullable=True)  # Hex color code

    # Subscription and billing
    # plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    # plan = relationship("Plan", backref="tenants")

    # Account status
    status = Column(Enum(TenantStatus), default=TenantStatus.ACTIVE)
    is_verified = Column(Boolean, default=False)

    # Administrative fields
    stripe_customer_id = Column(String, nullable=True)  # For payment processing
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # Removed tenant_modules to avoid conflict with Doctor model which uses TenantModule