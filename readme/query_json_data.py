import sys
sys.path.append("/app")
import json
from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun

db = ArkoSessionLocal()
run = db.query(LosaCalculationRun).filter(
    LosaCalculationRun.nombre_proyecto.ilike("%Valle Cielo%")
).order_by(LosaCalculationRun.id.desc()).first()

if run:
    inputs = run.inputs
    if isinstance(inputs, str):
        inputs = json.loads(inputs)
    results = getattr(run, 'resultados', None)
    if isinstance(results, str):
        results = json.loads(results)
    
    data = {"id": run.id, "nombre": run.nombre_proyecto, "created_at": str(run.created_at), "inputs": inputs, "results": results}
    with open("/app/valle_cielo_data.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Exported valle_cielo_data.json successfully.")

db.close()
