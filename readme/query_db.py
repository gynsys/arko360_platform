import sys
sys.path.append("/app")

from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
runs = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto.ilike("%flaco3%")).all()

for p in runs:
    print(f"Run ID: {p.id}, Title: {p.nombre_proyecto}")
    if p.inputs:
        data = p.inputs
        if isinstance(data, str):
            data = json.loads(data)
        
        columns = data.get("columns", [])
        if columns:
            print("Machones encontrados:")
            for c in columns:
                print(c)
        else:
            print("No se encontraron machones.")
db.close()
