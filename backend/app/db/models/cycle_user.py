"""
CycleUser model for cycle predictor users.
These are end-users who register to use the cycle predictor tool.
Each user belongs to a specific doctor/tenant.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Index, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.db.base import Base
import re


class CycleUser(Base):
    __tablename__ = "cycle_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    photo_url = Column(String(255), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Password Recovery - índice compuesto para búsquedas eficientes
    reset_password_token = Column(String, nullable=True)
    reset_password_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Índice para búsqueda por token (usado en reset-password)
    __table_args__ = (
        Index('idx_reset_token_expires', 'reset_password_token', 'reset_password_expires'),
        Index('idx_doctor_active', 'doctor_id', 'is_active'),  # Para queries de "mis pacientes activos"
        CheckConstraint('cycle_avg_length >= 21 AND cycle_avg_length <= 45', name='check_cycle_length'),
        CheckConstraint('period_avg_length >= 1 AND period_avg_length <= 15', name='check_period_length'),
    )
    
    # PWA Push Subscription con estructura validada
    push_subscription = Column(JSON, nullable=True)
    
    # Configuration fields con constraints de base de datos
    cycle_avg_length = Column(Integer, default=28, nullable=False)
    period_avg_length = Column(Integer, default=5, nullable=False)

    # Relationships
    doctor = relationship("Doctor", back_populates="cycle_users", lazy="joined")  # Eager loading para evitar N+1

    @property
    def theme_primary_color(self) -> str | None:
        """Return the doctor's theme primary color."""
        return getattr(self.doctor, 'theme_primary_color', None)

    @validates('email')
    def validate_email(self, key, email):
        """Normalize email to lowercase."""
        if email:
            return email.lower().strip()
        return email

    @validates('push_subscription')
    def validate_push_subscription(self, key, subscription):
        """Validate PWA subscription structure."""
        if subscription is not None:
            required_keys = {'endpoint', 'keys'}
            if not isinstance(subscription, dict):
                raise ValueError("Push subscription must be a dictionary")
            if not all(k in subscription for k in required_keys):
                raise ValueError(f"Push subscription must contain: {required_keys}")
            if 'p256dh' not in subscription['keys'] or 'auth' not in subscription['keys']:
                raise ValueError("Push subscription keys must contain 'p256dh' and 'auth'")
        return subscription

    def __repr__(self):
        return f"<CycleUser(id={self.id}, email={self.email}, doctor_id={self.doctor_id})>"
