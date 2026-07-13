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
    print("--- DATA ---")
    if p.inputs and p.resultados:
        data = p.inputs if isinstance(p.inputs, dict) else json.loads(p.inputs)
        res = p.resultados if isinstance(p.resultados, dict) else json.loads(p.resultados)
        
        Lx = data.get("geometry", {}).get("Lx", 0)
        Ly = data.get("geometry", {}).get("Ly", 0)
        
        nx = res.get("heatmaps", {}).get("nx", 0)
        ny = res.get("heatmaps", {}).get("ny", 0)
        
        if nx > 1 and ny > 1:
            dx = Lx / (nx - 1)
            dy = Ly / (ny - 1)
            print(f"Geometry: Lx = {Lx}m, Ly = {Ly}m")
            print(f"Mesh Nodes: nx = {nx}, ny = {ny}")
            print(f"Element Size (Spacing): dx = {dx:.3f}m, dy = {dy:.3f}m")
        else:
            print("No mesh data available.")
db.close()
