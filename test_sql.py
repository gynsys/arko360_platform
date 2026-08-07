from sqlalchemy import or_
from app.db.models.cost360 import CostItem, CostAPUMaterial, CostMaterial, CostAPUEquipment, CostEquipment, CostAPULabor, CostLabor
from sqlalchemy.orm import Query

q = Query(CostItem)
word = "alambre"
filters = [
    CostItem.apu_materials.any(CostAPUMaterial.material.has(CostMaterial.Descri.ilike(f"%{word}%"))),
    CostItem.apu_equipments.any(CostAPUEquipment.equipment.has(CostEquipment.Descri.ilike(f"%{word}%"))),
    CostItem.apu_labors.any(CostAPULabor.labor.has(CostLabor.Descri.ilike(f"%{word}%")))
]
q = q.filter(or_(*filters))

from sqlalchemy.dialects import postgresql
print(q.statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
