import sys
sys.path.append("/app")

from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
runs = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto.ilike("%Valle Cielo%")).all()

print(f"Total runs found: {len(runs)}")
for p in runs:
    print(f"\n--- Run ID: {p.id}, Title: '{p.nombre_proyecto}', User ID: {p.user_id} ---")
    if p.inputs:
        data = p.inputs
        if isinstance(data, str):
            data = json.loads(data)
        print("INPUTS geometry/walls:", data.get("Lx"), data.get("Ly"), data.get("h"), "walls:", len(data.get("walls", [])))
    if hasattr(p, 'resultados') and p.resultados:
        res = p.resultados
        if isinstance(res, str):
            res = json.loads(res)
        print("RESULTADOS keys:", list(res.keys()) if isinstance(res, dict) else "Not dict")
        if isinstance(res, dict) and "support_beam_designs" in res:
            print("SUPPORT BEAM DESIGNS:", json.dumps(res["support_beam_designs"], indent=2))
        if isinstance(res, dict) and "As_min_cm2_m" in res:
            print("As_min_cm2_m:", res.get("As_min_cm2_m"), "moments:", res.get("moments"))

db.close()
