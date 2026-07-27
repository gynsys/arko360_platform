import sys
sys.path.append("/app")

import json
from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
from app.schemas.calculadora import SlabModelInput
from app.api.v1.endpoints.calculadora import analyze_slab

db = ArkoSessionLocal()
run = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto.ilike("%Valle Cielo%")).order_by(LosaCalculationRun.id.desc()).first()

if run and run.inputs:
    payload = run.inputs
    if isinstance(payload, str):
        payload = json.loads(payload)

    # Probar con espesor h = 0.12m (12 cm) y mesh 40x40
    payload['geometry']['h'] = 0.12
    payload['materials']['h'] = 0.12
    
    input_model = SlabModelInput.model_validate(payload)
    res = analyze_slab(input_model)

    print(f"--- SIMULACIÓN CON h = 12cm ---")
    for idx, b in enumerate(res.get('bands', [])):
        mx = b.get('Mx_design_kNm_m', 0) * 101.9716
        my = b.get('My_design_kNm_m', 0) * 101.9716
        asx = b.get('Asx_cm2_m', 0)
        asy = b.get('Asy_cm2_m', 0)
        print(f"M{idx+1} ({b.get('type')}): Mx = {mx:.2f} | My = {my:.2f} | Asx = {asx:.2f} | Asy = {asy:.2f}")

db.close()
