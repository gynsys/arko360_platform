import sys
sys.path.append("/app")

from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
runs = db.query(LosaCalculationRun).all()

print(f"Total calculation runs in DB: {len(runs)}")
for p in runs:
    print(f"\nID: {p.id} | Proyecto: '{p.nombre_proyecto}' | User: {p.user_id} | Date: {p.created_at}")
    inputs = p.inputs
    if isinstance(inputs, str):
        inputs = json.loads(inputs)
    results = getattr(p, 'resultados', None)
    if isinstance(results, str):
        results = json.loads(results)

    if results and isinstance(results, dict) and "bands" in results:
        bands = results.get("bands", [])
        for idx, b in enumerate(bands):
            mx = b.get('Mx_design_kNm_m', 0) * 101.9716
            my = b.get('My_design_kNm_m', 0) * 101.9716
            print(f"  M{idx+1}: type={b.get('type')}, Mx={mx:.2f}, My={my:.2f}")

db.close()
