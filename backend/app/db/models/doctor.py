"""
Doctor model - represents a medical professional (tenant) in the system.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Doctor(Base):
    """
    Doctor model representing a medical professional.
    Each doctor is a tenant with their own customizable digital clinic.
    """
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for Google OAuth users
    
    # Password Recovery
    reset_password_token = Column(String, nullable=True)
    reset_password_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Profile information
    nombre_completo = Column(String, nullable=False)
    especialidad = Column(String, nullable=True)
    universidad = Column(String, nullable=True)
    biografia = Column(String, nullable=True)
    services_section_title = Column(String, nullable=True)
    
    # Multi-tenant URL identifier
    slug_url = Column(String, unique=True, index=True, nullable=False)
    
    # Customization fields
    logo_url = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)  # Doctor's profile photo
    theme_primary_color = Column(String, nullable=True)  # Hex color code
    theme_body_bg_color = Column(String, nullable=True)  # Custom body background color
    theme_container_bg_color = Column(String, nullable=True)  # Custom container background color
    design_template = Column(String, default='glass', nullable=True)  # 'glass', 'minimal', 'soft', 'dark'
    profile_image_border = Column(Boolean, default=True)  # Whether to show border around profile photo
    card_shadow = Column(Boolean, default=True)  # Whether to show shadows on cards
    container_shadow = Column(Boolean, default=True)  # Whether to show shadows on containers
    gallery_width = Column(String, nullable=True, default='100%')  # Gallery width for home page
    contact_email = Column(String, nullable=True)  # Email for contact form submissions
    schedule = Column(JSON, nullable=True)  # Doctor's consultation schedule
    pdf_config = Column(JSON, nullable=True)  # Configuration for PDF generation
    
    # Social Media
    social_youtube = Column(String, nullable=True)
    social_instagram = Column(String, nullable=True)
    social_tiktok = Column(String, nullable=True)
    social_x = Column(String, nullable=True)
    social_facebook = Column(String, nullable=True)
    whatsapp_url = Column(String, nullable=True)
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    status = Column(String, default='pending', nullable=False)  # 'pending', 'approved', 'rejected'
    
    # Clinic / Multi-tenant Hierarchy
    is_clinic = Column(Boolean, default=False)  # If True, this account represents a Clinic
    clinic_id = Column(Integer, ForeignKey('doctors.id'), nullable=True)  # Links a staff doctor to their Clinic
    
    # Subscription & Payment
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=True)
    payment_reference = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Role-based access control
    role = Column(String, default='user', nullable=False)  # 'user' or 'admin'
    
    # Certifications Section
    show_certifications_carousel = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    plan = relationship("Plan", backref="doctors")
    
    # Self-referential relationship for Clinic <-> Staff
    clinic = relationship("Doctor", remote_side=[id], back_populates="staff_doctors")
    staff_doctors = relationship("Doctor", back_populates="clinic", cascade="all, delete-orphan")
    
    # Relationships with full cascade for tenant deletion
    tenant_modules = relationship("TenantModule", back_populates="tenant", cascade="all, delete-orphan", foreign_keys="[TenantModule.tenant_id]")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan", foreign_keys="[Appointment.doctor_id]")
    assigned_appointments = relationship("Appointment", back_populates="assigned_staff", foreign_keys="[Appointment.assigned_staff_id]")
    patients = relationship("Patient", back_populates="doctor", cascade="all, delete-orphan")

    # Content # Analytics
    visitor_count = Column(Integer, default=0, nullable=False)
    
    faqs = relationship("FAQ", back_populates="doctor", cascade="all, delete-orphan")
    consultations = relationship("Consultation", back_populates="doctor", cascade="all, delete-orphan")
    testimonials = relationship("Testimonial", back_populates="doctor", cascade="all, delete-orphan")
    gallery_images = relationship("GalleryImage", back_populates="doctor", cascade="all, delete-orphan")
    locations = relationship("Location", back_populates="doctor", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="doctor", cascade="all, delete-orphan")
    certifications = relationship("DoctorCertification", back_populates="doctor", cascade="all, delete-orphan")
    # blog_posts = relationship("BlogPost", back_populates="doctor", cascade="all, delete-orphan")
    cycle_users = relationship("CycleUser", back_populates="doctor", cascade="all, delete-orphan")
    
    # Missing relationships for complete cleanup
    notification_rules = relationship("NotificationRule", back_populates="doctor", cascade="all, delete-orphan")
    notification_logs = relationship("NotificationLog", back_populates="doctor", cascade="all, delete-orphan")
    pending_notifications = relationship("PendingNotification", back_populates="doctor", cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="doctor", cascade="all, delete-orphan")
    online_settings = relationship("OnlineConsultationSettings", back_populates="doctor", cascade="all, delete-orphan", uselist=False)
    recommendations = relationship("Recommendation", back_populates="tenant", cascade="all, delete-orphan")
    preconsultation_questions = relationship("PreconsultationQuestion", back_populates="doctor", cascade="all, delete-orphan")
    cycle_logs = relationship("CycleLog", back_populates="doctor", cascade="all, delete-orphan")
    symptom_logs = relationship("SymptomLog", back_populates="doctor", cascade="all, delete-orphan")
    endometriosis_results = relationship("EndometriosisResult", back_populates="doctor", cascade="all, delete-orphan")

    @property
    def enabled_module_codes(self):
        """Return list of codes of enabled modules."""
        from sqlalchemy.orm import object_session
        from app.db.models.tenant_module import TenantModule
        from app.db.models.module import Module
        
        session = object_session(self)
        if not session:
            return []
        
        try:
            # Query enabled modules for this tenant
            enabled_modules = session.query(Module.code).join(
                TenantModule,
                TenantModule.module_id == Module.id
            ).filter(
                TenantModule.tenant_id == self.id,
                TenantModule.is_enabled == True
            ).all()
            
            return [code for (code,) in enabled_modules]
        except Exception:
            return []


class DoctorCertification(Base):
    """
    Model for doctor certifications and authority logos.
    """
    __tablename__ = "doctor_certifications"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g., Universidad Central de Venezuela
    title = Column(String, nullable=False)  # e.g., Médico Ginecólogo
    logo_url = Column(String, nullable=False)
    order = Column(Integer, default=0)
    
    doctor = relationship("Doctor", back_populates="certifications")


