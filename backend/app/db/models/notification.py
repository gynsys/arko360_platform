"""
Notification models - Simplified: 19 fixed types, editable content only.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, 
    ForeignKey, Text, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import Base


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    PUSH = "push"
    DUAL = "dual"


# Los tipos de notificación permitidos (108 en total)
VALID_NOTIFICATION_TYPES = {
    # Ciclo Menstrual Diario (28)
    "day_1_period_start", "day_2_symptom_check", "day_3_hydration", "day_4_mood_track",
    "day_5_flow_decrease", "day_6_energy_boost", "day_7_period_end", "day_8_skin_care",
    "day_9_fertile_approaching", "day_10_fertile_start", "day_11_high_fertility", "day_12_peak_fertility",
    "day_13_ovulation", "day_14_ovulation_peak", "day_15_fertile_end", "day_16_implantation_window",
    "day_17_mood_watch", "day_18_exercise_tip", "day_19_metabolism_alert", "day_20_rest_importance",
    "day_21_cycle_summary", "day_22_pms_start", "day_23_bloating_check", "day_24_mood_changes",
    "day_25_breast_tenderness", "day_26_period_preparation", "day_27_cramps_alert", "day_28_period_tomorrow",
    "period_late_1_day",
    
    # Seguimiento Prenatal Semanal (41)
    *[f"prenatal_week_{i}" for i in range(1, 42)],
    
    # Hitos y Alertas Prenatales (14)
    "prenatal_first_ultrasound", "prenatal_genetic_test", "prenatal_anatomy_scan", "prenatal_glucose_test",
    "prenatal_tdap_vaccine", "prenatal_group_b_strep", "prenatal_kick_counts", "prenatal_reduced_movement",
    "prenatal_bleeding", "prenatal_severe_headache", "prenatal_vision_changes", "prenatal_contractions",
    "prenatal_water_break", "prenatal_swelling",
    
    # Tips Prenatales (7)
    "prenatal_daily_tip", "prenatal_nutrition", "prenatal_exercise", "prenatal_hydration",
    "prenatal_mental_health", "prenatal_sleep", "prenatal_baby_size",
    
    # Eventos de Sistema (13)
    "system_welcome", "system_profile_incomplete", "system_log_period", "system_backup_reminder",
    "system_update_available", "system_data_sync", "system_appointment_reminder", "system_medication_reminder",
    "system_annual_checkup", "system_pap_smear", "system_mammogram", "system_privacy_update",
    "system_inactive_user",
    
    # Contraceptivos (4)
    "contraceptive_daily", "contraceptive_rest_start", "contraceptive_rest_end", "contraceptive_missed",

    # Administrativas Doctora (Asistente Virtual)
    "doctor_daily_agenda", "doctor_pending_stories", "doctor_low_agenda",
    "doctor_new_appointment", "doctor_preconsulta_completed", "doctor_new_contact_message",
    "doctor_new_online_consultation", "doctor_unified_onboarding",
}


class NotificationRule(Base):
    """
    Notification rule - Global Template (Closed App Model).
    Managed by SuperAdmin. individual doctors do not have separate rules.
    """
    __tablename__ = "notification_rules"

    id = Column(Integer, primary_key=True, index=True)
    
    # Nullable for Global Rules (System-wide)
    tenant_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    
    # IDENTIFICADOR FIJO
    notification_type = Column(String(50), nullable=False, index=True)
    
    # Metadata/Reference only (logic is now in Registry.py)
    trigger_condition = Column(JSON, nullable=True, default={}) 
    priority = Column(Integer, default=50)
    
    # CONTENIDO (Managed by Admin)
    title_template = Column(String(255), nullable=False)
    message_template = Column(Text, nullable=False)
    message_text_template = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=True)
    
    # SETTINGS
    channel = Column(String(20), default="dual")
    send_time = Column(String(10), default="08:00")
    
    # ESTADO
    is_active = Column(Boolean, default=True)
    is_edited = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="notification_rules")
    
    # Unique per type (one global rule per type)
    __table_args__ = (
        Index('idx_rule_type_tenant', 'notification_type', 'tenant_id', unique=True),
    )
    
    def validate_type(self) -> bool:
        """Check if notification_type is valid."""
        return self.notification_type in VALID_NOTIFICATION_TYPES
    
    def render_content(self, context: dict) -> dict:
        """Render templates with context variables."""
        try:
            return {
                "title": self.title_template.format(**context),
                "message_html": self.message_template.format(**context),
                "message_text": (self.message_text_template or self.message_template).format(**context),
                "image_url": (self.image_url.format(**context) if self.image_url else None)
            }
        except KeyError as e:
            # Fallback if variable missing
            return {
                "title": self.title_template,
                "message_html": self.message_template,
                "message_text": self.message_text_template,
                "render_error": f"Missing variable: {e}"
            }
    
    def reset_to_default(self, defaults: dict):
        """Restore default content."""
        self.title_template = defaults.get("title_template", "")
        self.message_template = defaults.get("message_template", "")
        self.message_text_template = defaults.get("message_text_template")
        self.image_url = defaults.get("image_url")
        self.channel = defaults.get("channel", "dual")
        self.send_time = defaults.get("send_time", "08:00")
        self.is_edited = False


class NotificationLog(Base):
    """History of sent notifications."""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    notification_rule_id = Column(Integer, ForeignKey("notification_rules.id"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("cycle_users.id"), nullable=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    
    # What was sent
    notification_type = Column(String(50), nullable=False)
    title_sent = Column(String(255), nullable=False)
    channel_used = Column(String(20), nullable=False)
    image_url = Column(String(512), nullable=True) # Snapshot what was sent
    
    # Result
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="sent")  # sent, failed, skipped
    error_message = Column(Text, nullable=True)
    
    # Tracking
    received_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)
    event_metadata = Column(JSON, nullable=True, default={})

    # Direct Recipient Info (for patients without App account)
    recipient_email_direct = Column(String(255), nullable=True, index=True)
    recipient_name_direct = Column(String(255), nullable=True)

    # Relationships
    rule = relationship("NotificationRule")
    recipient = relationship("CycleUser", backref="notification_logs")
    doctor = relationship("Doctor", back_populates="notification_logs")

    @property
    def recipient_name(self) -> Optional[str]:
        if self.recipient:
            return self.recipient.nombre_completo
        if self.doctor:
            return self.doctor.nombre_completo
        return self.recipient_name_direct

    @property
    def recipient_email(self) -> Optional[str]:
        if self.recipient:
            return self.recipient.email
        if self.doctor:
            return self.doctor.email
        return self.recipient_email_direct


class PendingNotification(Base):
    """Queue for notifications to be sent at a specific time."""
    __tablename__ = "pending_notifications"

    id = Column(Integer, primary_key=True, index=True)
    notification_rule_id = Column(Integer, ForeignKey("notification_rules.id"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("cycle_users.id"), nullable=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    
    # Content to send
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False) # HTML content
    message_text = Column(Text, nullable=True) # Plain text for Push
    image_url = Column(String(512), nullable=True)
    
    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    channel = Column(String(20), default="dual") # push, email, dual
    
    # Status
    status = Column(String(20), default="pending") # pending, sent, failed, retrying
    retry_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    event_metadata = Column(JSON, nullable=True, default={})
    
    # Direct Recipient Info (for patients without App account)
    recipient_email_direct = Column(String(255), nullable=True, index=True)
    recipient_name_direct = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)
    channel_used = Column(String(50), nullable=True)
    locked_by = Column(String(100), nullable=True)  # Para debugging de workers
    locked_at = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index('ix_pending_user_rule_date', 'recipient_id', 'notification_rule_id'),
        Index('ix_pending_doctor_rule_date', 'doctor_id', 'notification_rule_id'),
    )

    # Relationships
    rule = relationship("NotificationRule")
    recipient = relationship("CycleUser")
    doctor = relationship("Doctor", back_populates="pending_notifications")

    @property
    def recipient_name(self) -> Optional[str]:
        if self.recipient:
            return self.recipient.nombre_completo
        if self.doctor:
            return self.doctor.nombre_completo
        return self.recipient_name_direct

    @property
    def recipient_email(self) -> Optional[str]:
        if self.recipient:
            return self.recipient.email
        if self.doctor:
            return self.doctor.email
        return self.recipient_email_direct
