"""
PushSubscription model for PWA notifications.
Stores browser push subscription details for users.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("cycle_users.id"), index=True, nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), index=True, nullable=True)
    
    endpoint = Column(String, unique=True, index=True, nullable=True)
    p256dh = Column(String, nullable=True)
    auth = Column(String, nullable=True)
    token = Column(String, unique=True, index=True, nullable=True) # For Capacitor/FCM
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("CycleUser", backref="patient_push_subscriptions")
    doctor = relationship("Doctor", back_populates="push_subscriptions")
