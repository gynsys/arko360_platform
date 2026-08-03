from app.db.models.cost360_database import Cost360Database
from app.db.base import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # Crear tabla si no existe
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS cost360_databases (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            is_master BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            material_inflation FLOAT DEFAULT 0,
            labor_inflation FLOAT DEFAULT 0,
            equipment_inflation FLOAT DEFAULT 0,
            source_database_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(255)
        )
    """))
    db.commit()
    print("Tabla creada o ya existe")
except Exception as e:
    print(f"Error creando tabla: {e}")

# Verificar si existe la base maestra
master = db.query(Cost360Database).filter(Cost360Database.id == 'master').first()

if not master:
    master = Cost360Database(
        id='master',
        name='Base Maestra',
        description='Base de datos oficial de Cost360 con precios actualizados',
        is_master=True,
        is_active=True,
        material_inflation=0.0,
        labor_inflation=0.0,
        equipment_inflation=0.0
    )
    db.add(master)
    db.commit()
    print("Base maestra creada")
else:
    print("Base maestra ya existe")

db.close()
