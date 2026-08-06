import os
import sys

# Agrega la ruta del backend para importar los modulos
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.app.db.arko_base import ArkoSessionLocal

db = ArkoSessionLocal()
try:
    query = text("""
        SELECT "CodMat", "Descri", "UniMat", "CosMat" 
        FROM cost360_materials 
        WHERE "CodMat" NOT IN (SELECT DISTINCT "CodIns" FROM cost360_apu_materials) 
        LIMIT 5;
    """)
    result = db.execute(query).fetchall()
    
    print("5 MATERIALES SIN USO EN NINGUN APU:")
    print("-" * 50)
    for row in result:
        print(f"Ref: {row[0]}")
        print(f"Descripción: {row[1]}")
        print(f"Unidad: {row[2]} | Precio: Bs. {row[3]:.2f}")
        print("-" * 50)
finally:
    db.close()
