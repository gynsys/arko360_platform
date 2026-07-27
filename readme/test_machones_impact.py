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
    
    print(f"--- ANALIZANDO RUN ID: {run.id} ('{run.nombre_proyecto}') ---")
    
    # 1. Caso A: Con todos los machones actuales
    input_a = SlabModelInput.model_validate(payload)
    res_a = analyze_slab(input_a)

    print("\n[CASO A - CON MACHONES]")
    for idx, b in enumerate(res_a.get('bands', [])):
        mx = b.get('Mx_design_kNm_m', 0) * 101.9716
        my = b.get('My_design_kNm_m', 0) * 101.9716
        print(f"  Muro M{idx+1} ({b.get('type')}): Mx = {mx:.2f} kgf·m/m | My = {my:.2f} kgf·m/m")

    # 2. Caso B: Sin machones en M13 (remover machones en y=0)
    payload_b = json.loads(json.dumps(payload))
    payload_b['columns'] = [c for c in payload_b.get('columns', []) if abs(c.get('y', -1)) > 0.05]
    print(f"\nRemoviendo machones en y=0. Machones restantes: {len(payload_b['columns'])}")
    
    input_b = SlabModelInput.model_validate(payload_b)
    res_b = analyze_slab(input_b)

    print("\n[CASO B - SIN MACHONES EN M13]")
    for idx, b in enumerate(res_b.get('bands', [])):
        mx = b.get('Mx_design_kNm_m', 0) * 101.9716
        my = b.get('My_design_kNm_m', 0) * 101.9716
        print(f"  Muro M{idx+1} ({b.get('type')}): Mx = {mx:.2f} kgf·m/m | My = {my:.2f} kgf·m/m")

db.close()
