import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from sqlalchemy import text
from backend.app.db.arko_base import ArkoSessionLocal
import csv

db = ArkoSessionLocal()
try:
    query = text("""
        SELECT "CodMat", "Descri", "UniMat", "CosMat" 
        FROM cost360_materials 
        WHERE "CodMat" NOT IN (SELECT DISTINCT "CodIns" FROM cost360_apu_materials) 
    """)
    result = db.execute(query).fetchall()
    
    with open('/tmp/materiales_sin_uso.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Codigo", "Descripcion", "Unidad", "Precio"])
        for row in result:
            writer.writerow([row[0], row[1], row[2], row[3]])
finally:
    db.close()
