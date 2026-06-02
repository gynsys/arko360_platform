"""
Pydantic schemas for CycleUser (cycle predictor users).
"""
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
import re


class CycleUserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    nombre_completo: str = Field(..., min_length=2, max_length=255, description="User's full name")
    photo_url: Optional[str] = Field(None, description="URL to user's profile photo")
    cycle_avg_length: int = Field(default=28, ge=21, le=45, description="Average cycle length in days")
    period_avg_length: int = Field(default=5, ge=1, le=15, description="Average period length in days")


class CycleUserCreate(CycleUserBase):
    password: str = Field(..., min_length=8, max_length=128, description="User password (min 8 chars)")
    doctor_slug: Optional[str] = Field(None, pattern=r'^[a-z0-9]+(-[a-z0-9]+)*$', description="Doctor URL slug (optional)")
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password contains at least one letter and one number."""
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v
    
    @field_validator('doctor_slug')
    @classmethod
    def normalize_slug(cls, v: Optional[str]) -> Optional[str]:
        """Normalize slug to lowercase."""
        if v is None:
            return v
        return v.lower().strip()


class CycleUserUpdate(BaseModel):
    nombre_completo: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    cycle_avg_length: Optional[int] = Field(None, ge=21, le=45)
    period_avg_length: Optional[int] = Field(None, ge=1, le=15)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    
    @field_validator('password')
    @classmethod
    def password_strength_optional(cls, v: Optional[str]) -> Optional[str]:
        """Validate password strength if provided."""
        if v is None:
            return v
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v
    
    model_config = ConfigDict(extra='forbid')  # Prevenir campos extra


class CycleUserInDB(CycleUserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    doctor_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class CycleUserResponse(CycleUserBase):
    """Public user information (safe to return to client)."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime
    photo_url: Optional[str] = Field(None, description="URL to user's profile photo")
    theme_primary_color: Optional[str] = Field(None, description="Doctor's primary brand color")


class CycleUserAdminResponse(CycleUserInDB):
    """Extended information for admin/doctor views."""
    reset_password_expires: Optional[datetime] = Field(None, description="Password reset token expiration (admin only)")
    has_push_subscription: bool = Field(False, description="Whether user has PWA notifications enabled")
    
    @field_validator('has_push_subscription', mode='before')
    @classmethod
    def check_push_subscription(cls, v, info):
        """Derive from push_subscription field."""
        data = info.data
        return data.get('push_subscription') is not None


class CycleUserLoginRequest(BaseModel):
    """Schema for login requests."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class PushSubscriptionSchema(BaseModel):
    """Validated PWA push subscription structure."""
    endpoint: str = Field(..., pattern=r'^https://')
    keys: dict = Field(...)
    
    @field_validator('keys')
    @classmethod
    def validate_keys(cls, v: dict) -> dict:
        if 'p256dh' not in v or 'auth' not in v:
            raise ValueError("Keys must contain 'p256dh' and 'auth'")
        return v
