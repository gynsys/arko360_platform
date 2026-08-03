import subprocess
import sys

# Ejecutar comando para inicializar base maestra
command = "cd /var/www/arko360_platform && docker compose exec backend python -c \"from app.db.models.cost360_database import Cost360Database; from app.db.base import SessionLocal; from sqlalchemy import text; db = SessionLocal(); db.execute(text('CREATE TABLE IF NOT EXISTS cost360_databases (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, is_master BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE, material_inflation FLOAT DEFAULT 0, labor_inflation FLOAT DEFAULT 0, equipment_inflation FLOAT DEFAULT 0, source_database_id VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, created_by VARCHAR(255))')); db.commit(); master = db.query(Cost360Database).filter(Cost360Database.id == 'master').first(); if not master: master = Cost360Database(id='master', name='Base Mauestra', description='Base oficial', is_master=True, is_active=True, material_inflation=0.0, labor_inflation=0.0, equipment_inflation=0.0); db.add(master); db.commit(); print('Base maestra inicializada')\""

print("Ejecutando inicialización de base maestra...")
result = subprocess.run(['python', 'ssh_runner.py', command], capture_output=True, text=True)

print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Return code:", result.returncode)

if result.returncode == 0:
    print("✅ Base maestra inicializada")
else:
    print("❌ Error al inicializar")
