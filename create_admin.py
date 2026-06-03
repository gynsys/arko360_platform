#!/usr/bin/env python3
"""Script para crear el usuario admin de Arko360 en la base de datos."""
import sys
sys.path.insert(0, '/app')

from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://arko_user:arko_password@db:5432/arko360')

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
    create_admin(
        email="admin@arko360.net",
        password="Arko2024@Admin",
        full_name="Administrador Arko360"
    )
