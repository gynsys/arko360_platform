import sys
sys.path.append("/app")

from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
runs = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto.ilike("%Valle Cielo%")).all()

for p in runs:
    print(f"=====================================")
    print(f"Run ID: {p.id}, Title: {p.nombre_proyecto}")
    print("--- INPUTS ---")
    if p.inputs:
        data = p.inputs
        if isinstance(data, str):
            data = json.loads(data)
        print(json.dumps(data, indent=2))
    print("--- RESULTADOS ---")
    if p.resultados:
        res = p.resultados
        if isinstance(res, str):
            res = json.loads(res)
        print(json.dumps(res, indent=2))
db.close()
