"""
Pydantic schemas for Doctor entity.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.location import Location as LocationSchema


class DoctorBase(BaseModel):
    """Base schema with common doctor fields."""
    email: str
    nombre_completo: str
    especialidad: Optional[str] = None
    universidad: Optional[str] = None
    biografia: Optional[str] = None
    services_section_title: Optional[str] = None
    role: str = Field(default="user", description="User role: 'user' or 'admin'")
    contact_email: Optional[EmailStr] = None
    schedule: Optional[Dict[str, Any]] = None
    pdf_config: Optional[Dict[str, Any]] = None
    is_clinic: Optional[bool] = False
    
    # Social Media
    social_youtube: Optional[str] = None
    social_instagram: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_x: Optional[str] = None
    social_facebook: Optional[str] = None
    whatsapp_url: Optional[str] = None


class DoctorCreate(DoctorBase):
    """Schema for creating a new doctor."""
    password: str = Field(..., min_length=8)
    slug_url: Optional[str] = None  # Auto-generated if not provided
    plan_id: Optional[int] = None
    payment_reference: Optional[str] = None


class CertificationBase(BaseModel):
    """Base schema for certifications."""
    name: Optional[str] = Field(None, description="Name of the institution (e.g. UCV)")
    title: Optional[str] = Field(None, description="Title/Degree obtained")
    logo_url: Optional[str] = Field(None, description="URL of the logo image")
    order: int = Field(default=0)

class CertificationCreate(CertificationBase):
    """Schema for creating a certification."""
    pass

class CertificationUpdate(BaseModel):
    """Schema for updating a certification."""
    name: Optional[str] = None
    title: Optional[str] = None
    logo_url: Optional[str] = None
    order: Optional[int] = None

class CertificationInDB(CertificationBase):
    """Schema for certification in database."""
    id: int
    doctor_id: int

    class Config:
        from_attributes = True


class ModuleSimple(BaseModel):
    """Simple module info for status listing."""
    code: str
    name: str
    description: Optional[str] = None
    is_enabled_for_user: bool = False

    class Config:
        from_attributes = True


class DoctorUpdate(BaseModel):
    """Schema for updating doctor information."""
    nombre_completo: Optional[str] = None
    especialidad: Optional[str] = None
    universidad: Optional[str] = None
    biografia: Optional[str] = None
    services_section_title: Optional[str] = None
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    theme_primary_color: Optional[str] = None
    theme_body_bg_color: Optional[str] = None
    theme_container_bg_color: Optional[str] = None
    design_template: Optional[str] = None
    profile_image_border: Optional[bool] = None
    card_shadow: Optional[bool] = None
    container_shadow: Optional[bool] = None
    gallery_width: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    schedule: Optional[Dict[str, Any]] = None
    pdf_config: Optional[Dict[str, Any]] = None
    show_certifications_carousel: Optional[bool] = None
    
    # Social Media
    social_youtube: Optional[str] = None
    social_instagram: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_x: Optional[str] = None
    social_facebook: Optional[str] = None
    whatsapp_url: Optional[str] = None
    
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[str] = Field(None, description="User role: 'user' or 'admin' - Admin only")
    status: Optional[str] = None
    plan_id: Optional[int] = None
    
    # Module Update
    enabled_modules: Optional[List[str]] = Field(None, description="List of module codes to enable")


class DoctorInDB(DoctorBase):
    """Schema for internal use (includes sensitive data)."""
    id: int
    slug_url: Optional[str] = None
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    theme_primary_color: Optional[str] = None
    theme_body_bg_color: Optional[str] = None
    theme_container_bg_color: Optional[str] = None
    design_template: Optional[str] = 'glass'
    profile_image_border: Optional[bool] = True
    card_shadow: Optional[bool] = None
    container_shadow: Optional[bool] = None
    gallery_width: Optional[str] = None
    is_active: Optional[bool] = True
    is_verified: Optional[bool] = False
    status: Optional[str] = 'pending'
    plan_id: Optional[int] = None
    role: str = "user"
    show_certifications_carousel: Optional[bool] = False
    certifications: List[CertificationInDB] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    enabled_modules: List[str] = Field(default=[], validation_alias="enabled_module_codes")
    modules_status: List[ModuleSimple] = [] # Detailed status of all modules

    class Config:
        from_attributes = True


class DoctorPublic(DoctorBase):
    """Schema for public API (excludes sensitive information)."""
    id: int
    slug_url: str
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    theme_primary_color: Optional[str] = None
    theme_body_bg_color: Optional[str] = None
    theme_container_bg_color: Optional[str] = None
    design_template: Optional[str] = 'glass'
    profile_image_border: Optional[bool] = True
    card_shadow: Optional[bool] = None
    container_shadow: Optional[bool] = None
    gallery_width: Optional[str] = None
    especialidad: Optional[str] = None
    universidad: Optional[str] = None
    biografia: Optional[str] = None
    role: str = "user"
    show_certifications_carousel: Optional[bool] = False
    certifications: List[CertificationInDB] = []
    locations: List[LocationSchema] = []
    enabled_modules: List[str] = Field(default=[], validation_alias="enabled_module_codes")

    class Config:
        from_attributes = True

