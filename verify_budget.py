import sys
sys.path.append('/app')
from app.schemas.budget import BudgetItemCreate
from app.api.v1.endpoints.budgets import add_item_to_budget
print("OK: schema y endpoint importados correctamente")
# Verificar que BudgetItemCreate acepta materials
test = BudgetItemCreate(
    cod_par="TEST001",
    description="Partida de prueba",
    unit="m2",
    quantity=1.0,
    performance=1.0,
    materials=[{"codigo": "MAT001", "descripcion": "Material", "cantidad": 2.0, "unidad": "kg", "precio_unitario": 110.0}],
    equipments=[],
    labors=[]
)
print(f"OK: BudgetItemCreate acepta materials: {len(test.materials)} items")
