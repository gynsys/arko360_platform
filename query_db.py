from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
p = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto == 'losa flaco4').order_by(LosaCalculationRun.created_at.desc()).first()
if p:
    print("INPUTS:")
    print(json.dumps(p.inputs, indent=2))
else:
    print("Not found")
