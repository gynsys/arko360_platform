from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.db.base import get_db
from app.db.models.budget import Budget, BudgetItem, BudgetAPUMaterial as DBMaterial, BudgetAPUEquipment as DBEquipment, BudgetAPULabor as DBLabor
from app.db.models.cost360 import CostItem, CostAPUMaterial, CostAPUEquipment, CostAPULabor
from app.schemas.budget import Budget as BudgetSchema, BudgetCreate, BudgetUpdate, BudgetSummary, BudgetItemCreate, BudgetItem as BudgetItemSchema, BudgetItemUpdate, BudgetAPUMaterialBase, BudgetAPUMaterial, BudgetAPUEquipmentBase, BudgetAPUEquipment, BudgetAPULaborBase, BudgetAPULabor

router = APIRouter()

@router.post("/", response_model=BudgetSchema, status_code=status.HTTP_201_CREATED)
def create_budget(budget_in: BudgetCreate, db: Session = Depends(get_db)):
    db_budget = Budget(**budget_in.model_dump())
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.get("/", response_model=List[BudgetSummary])
def get_budgets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    budgets = db.query(Budget).offset(skip).limit(limit).all()
    return budgets

@router.get("/{budget_id}", response_model=BudgetSchema)
def get_budget(budget_id: str, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget

@router.put("/{budget_id}", response_model=BudgetSchema)
def update_budget(budget_id: str, budget_in: BudgetUpdate, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}")
def delete_budget(budget_id: str, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
    return {"ok": True}

@router.post("/{budget_id}/items", response_model=BudgetItemSchema)
def add_item_to_budget(budget_id: str, item_in: BudgetItemCreate, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    target_order = item_in.order
    if target_order <= 0:
        max_order = db.query(func.max(BudgetItem.order)).filter(BudgetItem.budget_id == budget_id).scalar() or 0
        target_order = max_order + 1
    else:
        db.query(BudgetItem).filter(
            BudgetItem.budget_id == budget_id,
            BudgetItem.order >= target_order
        ).update({BudgetItem.order: BudgetItem.order + 1})
    
    # 1. Crear el BudgetItem
    item_data = item_in.model_dump()
    item_data["order"] = target_order
    db_item = BudgetItem(**item_data, budget_id=budget_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # If it is a chapter, skip APU copying
    if item_in.is_chapter:
        return db_item
    
    # 2. Copiar el APU de Cost360 hacia el BudgetAPU
    cost_item = db.query(CostItem).filter(CostItem.CodPar == item_in.cod_par).first()
    if cost_item:
        for mat in cost_item.apu_materials:
            db_mat = DBMaterial(
                budget_item_id=db_item.id,
                codigo=mat.CodIns,
                descripcion=mat.material.Descri if mat.material else "",
                unidad=mat.material.UniMat if mat.material else "",
                precio_unitario=(mat.material.CosMat if (mat.material and mat.material.CosMat is not None) else 0.0),
                cantidad=mat.CanIns or 0.0,
                desperdicio=mat.Desper or 0.0
            )
            db.add(db_mat)
            
        for eq in cost_item.apu_equipments:
            db_eq = DBEquipment(
                budget_item_id=db_item.id,
                codigo=eq.CodIns,
                descripcion=eq.equipment.Descri if eq.equipment else "",
                unidad="Día",
                precio_unitario=(eq.equipment.CosDia if (eq.equipment and eq.equipment.CosDia is not None) else 0.0),
                cantidad=eq.CanIns or 0.0,
                depreciacion=eq.Deprec or 1.0
            )
            db.add(db_eq)
            
        for lab in cost_item.apu_labors:
            db_lab = DBLabor(
                budget_item_id=db_item.id,
                codigo=lab.CodIns,
                descripcion=lab.labor.Descri if lab.labor else "",
                jornal=(lab.labor.Jornal if (lab.labor and lab.labor.Jornal is not None) else 0.0),
                bono=(lab.labor.Bono if (lab.labor and lab.labor.Bono is not None) else 0.0),
                cantidad=lab.CanIns or 0.0
            )
            db.add(db_lab)
            
        db.commit()
        db.refresh(db_item)
        
    return db_item

@router.delete("/{budget_id}/items/{item_id}")
def delete_item_from_budget(budget_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(BudgetItem).filter(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

@router.post("/{budget_id}/items/reorder")
def reorder_budget_items(budget_id: str, item_ids: List[str], db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    for index, item_id in enumerate(item_ids):
        db.query(BudgetItem).filter(
            BudgetItem.id == item_id, 
            BudgetItem.budget_id == budget_id
        ).update({BudgetItem.order: index + 1})
        
    db.commit()
    return {"ok": True}

@router.put("/{budget_id}/items/{item_id}", response_model=BudgetItemSchema)
def update_item_in_budget(budget_id: str, item_id: str, item_in: BudgetItemUpdate, db: Session = Depends(get_db)):
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    db_item = db.query(BudgetItem).filter(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found in budget")
        
    for key, value in item_in.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/{budget_id}/items/{item_id}/materials", response_model=BudgetAPUMaterial)
def add_material_to_item(budget_id: str, item_id: str, material_in: BudgetAPUMaterialBase, db: Session = Depends(get_db)):
    db_item = db.query(BudgetItem).filter(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db_material = DBMaterial(
        budget_item_id=item_id,
        **material_in.dict()
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material

@router.post("/{budget_id}/items/{item_id}/equipments", response_model=BudgetAPUEquipment)
def add_equipment_to_item(budget_id: str, item_id: str, equipment_in: BudgetAPUEquipmentBase, db: Session = Depends(get_db)):
    db_item = db.query(BudgetItem).filter(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db_equipment = DBEquipment(
        budget_item_id=item_id,
        **equipment_in.dict()
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@router.post("/{budget_id}/items/{item_id}/labors", response_model=BudgetAPULabor)
def add_labor_to_item(budget_id: str, item_id: str, labor_in: BudgetAPULaborBase, db: Session = Depends(get_db)):
    db_item = db.query(BudgetItem).filter(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db_labor = DBLabor(
        budget_item_id=item_id,
        **labor_in.dict()
    )
    db.add(db_labor)
    db.commit()
    db.refresh(db_labor)
    return db_labor

@router.post("/{budget_id}/sync_prices")
def sync_budget_prices(budget_id: str, db: Session = Depends(get_db)):
    from app.db.models.cost360 import CostMaterial, CostEquipment, CostLabor
    
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
        
    for item in budget.items:
        # Sync Materials
        for mat in item.materials:
            cost_mat = db.query(CostMaterial).filter(CostMaterial.CodMat == mat.codigo).first()
            if cost_mat:
                mat.precio_unitario = cost_mat.CosMat if cost_mat.CosMat is not None else 0.0
                mat.descripcion = cost_mat.Descri if cost_mat.Descri is not None else mat.descripcion
                
        # Sync Equipment
        for eq in item.equipments:
            cost_eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == eq.codigo).first()
            if cost_eq:
                eq.precio_unitario = cost_eq.CosDia if cost_eq.CosDia is not None else 0.0
                eq.descripcion = cost_eq.Descri if cost_eq.Descri is not None else eq.descripcion
                
        # Sync Labor
        for lab in item.labors:
            cost_lab = db.query(CostLabor).filter(CostLabor.CodMan == lab.codigo).first()
            if cost_lab:
                lab.jornal = cost_lab.Jornal if cost_lab.Jornal is not None else 0.0
                lab.bono = cost_lab.Bono if cost_lab.Bono is not None else 0.0
                lab.descripcion = cost_lab.Descri if cost_lab.Descri is not None else lab.descripcion
                
    db.commit()
    return {"status": "ok", "message": "Precios sincronizados con la Base Maestra"}
