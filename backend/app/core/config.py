"""
Configuration module for GynSys Backend.
Uses Pydantic BaseSettings to load environment variables.
"""

from pydantic_settings import BaseSettings
from typing import Optional, List, Union
import os
from pydantic import AnyHttpUrl, field_validator



class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database — credentials must come from the environment, never from code.
    DATABASE_URL: str = "sqlite:///./arko360.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Prevent production deployments falling back to the local dev database."""
        if not v or v.startswith("sqlite"):
            if os.getenv("ENVIRONMENT", "development") == "production":
                raise ValueError("DATABASE_URL must be explicitly set in production.")
        return v

    # JWT Security — Validated at startup (see validator below)
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Prevent production deployments with default/empty SECRET_KEY."""
        import secrets as _secrets
        import logging as _logging
        if not v or v == "your-secret-key-change-in-production":
            env = os.getenv("ENVIRONMENT", "development")
            if env == "production":
                raise ValueError(
                    "SECRET_KEY must be explicitly set in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            _logging.getLogger(__name__).warning(
                "⚠️ Using auto-generated SECRET_KEY. Set it explicitly via .env for consistency."
            )
            return _secrets.token_urlsafe(64)
        return v
    
    # URLs
    FRONTEND_URL: str = "https://www.gynsys.net"
    BACKEND_URL: str = "https://api.gynsys.net"

    # Resend Email Configuration
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "Arko360 <info@arko360.net>"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # OAuth Security - Email Whitelist
    ALLOWED_OAUTH_EMAILS: str = ""  # Comma-separated list of allowed emails
    ALLOWED_OAUTH_DOMAINS: str = ""  # Comma-separated list of allowed domains (e.g., "@gynsys.com")
    
    @property
    def oauth_allowed_emails(self) -> List[str]:
        """Parse comma-separated emails into list."""
        if not self.ALLOWED_OAUTH_EMAILS:
            return []
        return [email.strip() for email in self.ALLOWED_OAUTH_EMAILS.split(",") if email.strip()]
    
    @property
    def oauth_allowed_domains(self) -> List[str]:
        """Parse comma-separated domains into list."""
        if not self.ALLOWED_OAUTH_DOMAINS:
            return []
        return [domain.strip() for domain in self.ALLOWED_OAUTH_DOMAINS.split(",") if domain.strip()]

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "https://arko360.net",
        "https://www.arko360.net",
        "https://admin.arko360.net",
        "https://superadmin.arko360.net",
        "https://api.arko360.net",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5174", 
        "http://127.0.0.1:5174"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins = v
        if isinstance(v, str):
            # Permite formato JSON o CSV
            if v.startswith("["):
                import json
                origins = json.loads(v)
            else:
                origins = [i.strip() for i in v.split(",")]
        
        # Enforce Production Domains (Safety Net against outdated .env)
        required_origins = [
            "https://arko360.net",
            "https://www.arko360.net",
            "https://admin.arko360.net",
            "https://superadmin.arko360.net",
            "https://api.arko360.net",
           
            "http://localhost",
            "capacitor://localhost"
        ]
        
        if isinstance(origins, list):
            # Clean origins: no trailing slashes, no spaces
            origins = [o.strip().rstrip("/") for o in origins if o.strip()]
            for domain in required_origins:
                clean_domain = domain.strip().rstrip("/")
                if clean_domain not in origins:
                    origins.append(clean_domain)
            if os.getenv("ENVIRONMENT", "development") == "production":
                # Dev servers must not be trusted origins for credentialed requests.
                origins = [
                    o for o in origins
                    if o == "http://localhost" or not o.startswith(("http://localhost:", "http://127.0.0.1"))
                ]
            return origins
            
        return v

    # Debug flag (read from .env; useful for local development)
    DEBUG: bool = False

    # Celery & Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    # Data Encryption (Fernet key). Must be provided via the environment.
    ENCRYPTION_KEY: Optional[str] = None

    @field_validator("ENCRYPTION_KEY", mode="before")
    @classmethod
    def validate_encryption_key(cls, v: Optional[str]) -> Optional[str]:
        """Refuse to start in production without an explicit encryption key."""
        if not v and os.getenv("ENVIRONMENT", "development") == "production":
            raise ValueError(
                "ENCRYPTION_KEY must be explicitly set in production. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return v

    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = "smtp.gmail.com"
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    
    # Force verified domain sender
    EMAILS_FROM_EMAIL: str | None = "info@gynsys.net" 
    EMAILS_FROM_NAME: str = "GynSys Notificaciones"
    
    # MinIO / S3
    MINIO_ENDPOINT: str = "minio:9000" # Internal Docker URL
    MINIO_PUBLIC_ENDPOINT: str = "http://localhost:9000" # URL accessible from Browser
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_BUCKET: str = "gynsys-media"

    # VAPID (Web Push)
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_CLAIM_EMAIL: str = "admin@gynsys.com"
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "dramarielh@gmail.com")
    
    # Firebase (Native Push)
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

    # Google Gemini AI
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    # Groq AI (Fallback)
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")

    # Notificaciones — Modo Debug
    # Cuando True: bypasea la guardia de "1 notificación por tipo por día"
    # Permite re-enviar la misma notificación múltiples veces para pruebas.
    # NUNCA activar en producción real con usuarios reales.
    NOTIFICATIONS_DEBUG_MODE: bool = False

    class Config:
        render_env = "/etc/secrets/.env"
        if os.path.exists(render_env):
            env_file = render_env
        else:
            env_file = ".env"
            
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


# Global settings instance
settings = Settings()

