from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
p = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto == 'losa flaco3').order_by(LosaCalculationRun.created_at.desc()).first()
if p:
    print(json.dumps(p.resultados.get('materials_computation', {}).get('superstructure', {}), indent=2))
else:
    print("Not found")
