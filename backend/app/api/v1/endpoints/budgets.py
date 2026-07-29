from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.db.models.budget import Budget, BudgetItem, BudgetAPUMaterial, BudgetAPUEquipment, BudgetAPULabor
from app.db.models.cost360 import CostItem, CostAPUMaterial, CostAPUEquipment, CostAPULabor
from app.schemas.budget import Budget as BudgetSchema, BudgetCreate, BudgetUpdate, BudgetSummary, BudgetItemCreate, BudgetItem as BudgetItemSchema

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
    
    # 1. Crear el BudgetItem
    db_item = BudgetItem(**item_in.model_dump(), budget_id=budget_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # 2. Copiar el APU de Cost360 hacia el BudgetAPU
    cost_item = db.query(CostItem).filter(CostItem.CodPar == item_in.cod_par).first()
    if cost_item:
        for mat in cost_item.apu_materials:
            db_mat = BudgetAPUMaterial(
                budget_item_id=db_item.id,
                codigo=mat.CodIns,
                descripcion=mat.material.Descri if mat.material else "",
                unidad=mat.material.UniMat if mat.material else "",
                precio_unitario=(mat.material.CosMat if (mat.material and mat.material.CosMat is not None) else 0.0),
                cantidad=mat.CanIns or 0.0
            )
            db.add(db_mat)
            
        for eq in cost_item.apu_equipments:
            db_eq = BudgetAPUEquipment(
                budget_item_id=db_item.id,
                codigo=eq.CodIns,
                descripcion=eq.equipment.Descri if eq.equipment else "",
                unidad="Día",
                precio_unitario=(eq.equipment.CosDia if (eq.equipment and eq.equipment.CosDia is not None) else 0.0),
                cantidad=eq.CanIns or 0.0
            )
            db.add(db_eq)
            
        for lab in cost_item.apu_labors:
            db_lab = BudgetAPULabor(
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
