#!/usr/bin/env python3
"""Script para crear el usuario admin de Arko360 en la base de datos."""
import sys
sys.path.insert(0, '/app')

from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise SystemExit('DATABASE_URL environment variable is required.')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

from app.db.models.arko import ArkoAdmin

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin(email: str, password: str, full_name: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(ArkoAdmin).filter(ArkoAdmin.email == email).first()
        if existing:
            print(f"Admin {email} ya existe. Actualizando contraseña...")
            existing.hashed_password = pwd_context.hash(password)
            existing.is_active = True
            db.commit()
            print(f"Contraseña actualizada para {email}")
        else:
            admin = ArkoAdmin(
                email=email,
                hashed_password=pwd_context.hash(password),
                full_name=full_name,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"Admin {email} creado exitosamente.")
    finally:
        db.close()

if __name__ == "__main__":
    admin_password = os.getenv("ARKO_ADMIN_PASSWORD")
    if not admin_password:
        raise SystemExit("ARKO_ADMIN_PASSWORD environment variable is required.")

    create_admin(
        email=os.getenv("ARKO_ADMIN_EMAIL", "admin@arko360.net"),
        password=admin_password,
        full_name=os.getenv("ARKO_ADMIN_NAME", "Administrador Arko360")
    )
