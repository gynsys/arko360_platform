import sys
sys.path.append('/app/app')
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem
from app.api.v1.endpoints.cost360 import get_apu_materials, get_apu_equipments, get_apu_labors

db = SessionLocal()
item = db.query(CostItem).filter(CostItem.CodPar == 'ECS200').first()
rendi = item.RenPar or 1.0
print(f"Partida: {item.CodPar} - Rendimiento: {rendi} - Costo Directo BD: {item.PreUni}")

mat_cost = 0
for rel, mat in get_apu_materials(db, 'ECS200'):
    desper = getattr(rel, 'Desper', 0.0) or 0.0
    cost = rel.CanIns * mat.CosMat * (1 + desper/100.0)
    mat_cost += cost

eq_cost = 0
for rel, eq in get_apu_equipments(db, 'ECS200'):
    deprec = getattr(rel, 'Deprec', 1.0) or 1.0
    cost = rel.CanIns * eq.CosDia * deprec
    eq_cost += cost

mo_cost = 0
for rel, mo in get_apu_labors(db, 'ECS200'):
    jornal = mo.Jornal or 0.0
    bono = mo.Bono or 0.0
    cost = rel.CanIns * (jornal + bono)
    mo_cost += cost

print(f"\nSumatorias:")
print(f"Mat Cost (Total por M3): {mat_cost}")
print(f"Eq Cost (Diario): {eq_cost} -> Por M3: {eq_cost / rendi}")
print(f"MO Cost (Diario): {mo_cost} -> Por M3: {mo_cost / rendi}")

total_calc = mat_cost + (eq_cost + mo_cost) / rendi
print(f"Total Base Calculado: {total_calc}")
print(f"Total BD: {item.PreUni}")
