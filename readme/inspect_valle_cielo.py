import sys
sys.path.append("/app")

from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
runs = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto.ilike("%Valle Cielo%")).all()

print(f"Total runs found: {len(runs)}")
for p in runs:
    print(f"\n=======================================================")
    print(f"Run ID: {p.id} | Proyecto: '{p.nombre_proyecto}' | User ID: {p.user_id} | Created: {p.created_at}")
    print(f"=======================================================")
    
    inputs = p.inputs
    if isinstance(inputs, str):
        inputs = json.loads(inputs)
    
    results = getattr(p, 'resultados', None)
    if isinstance(results, str):
        results = json.loads(results)

    print("\n--- INPUTS ---")
    print(f"Geometría: Lx={inputs.get('Lx')}, Ly={inputs.get('Ly')}, h={inputs.get('h')}, q_adm={inputs.get('q_adm')}, fc={inputs.get('fc')}, fy={inputs.get('fy')}")
    print(f"Total walls: {len(inputs.get('walls', []))}")
    print(f"Total columns (machones): {len(inputs.get('columns', []))}")
    
    # Imprimir columnas
    cols = inputs.get('columns', [])
    for idx, c in enumerate(cols):
        print(f"  Machón {idx+1}: x={c.get('x')}, y={c.get('y')}, w={c.get('width')}, L={c.get('length')}, load_kgf={c.get('load_kgf')}")

    # Imprimir todos los muros
    walls = inputs.get('walls', [])
    for idx, w in enumerate(walls):
        w_id = f"M{idx+1}"
        length = ((w.get('x2', 0) - w.get('x1', 0))**2 + (w.get('y2', 0) - w.get('y1', 0))**2)**0.5
        print(f"  {w_id}: x1={w.get('x1')}, y1={w.get('y1')}, x2={w.get('x2')}, y2={w.get('y2')}, type={w.get('type')}, len={length:.2f}m")

    if results and isinstance(results, dict):
        print("\n--- RESULTADOS ---")
        bands = results.get("bands", [])
        print(f"Total bands (diseño por muro): {len(bands)}")
        for idx, b in enumerate(bands):
            print(f"  Muro M{idx+1}: type={b.get('type')}, band_width={b.get('band_width')}, Mx={b.get('Mx_design_kNm_m')}, My={b.get('My_design_kNm_m')}, Mx_kgfm={(b.get('Mx_design_kNm_m',0)*101.9716):.2f}, My_kgfm={(b.get('My_design_kNm_m',0)*101.9716):.2f}, Asx={b.get('Asx_cm2_m')}, Asy={b.get('Asy_cm2_m')}")

db.close()
