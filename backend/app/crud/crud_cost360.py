from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List, Tuple
from app.db.models.cost360 import (
    CostItem, CostMaterial, CostEquipment, CostLabor,
    CostAPUMaterial, CostAPUEquipment, CostAPULabor, CustomCostItem
)
from app.schemas.cost360 import (
    CostMaterialUpdate, CostEquipmentUpdate, CostLaborUpdate
)
import uuid

def get_items_paginated(db: Session, skip: int = 0, limit: int = 50, search: Optional[str] = None, chapter: Optional[str] = None, categoria: Optional[str] = None, tipo_actividad: Optional[str] = None):
    query = db.query(CostItem)
    if search:
        words = search.split()
        for word in words:
            query = query.filter(
                (CostItem.Descri.ilike(f"%{word}%")) | 
                (CostItem.CodPar.ilike(f"%{word}%")) |
                (CostItem.CovPar.ilike(f"%{word}%"))
            )
    if chapter:
        query = query.filter(CostItem.CodPar.startswith(chapter))
    if categoria:
        query = query.filter(CostItem.Categoria == categoria)
    if tipo_actividad:
        query = query.filter(CostItem.TipoActividad == tipo_actividad)
    
    total = query.count()
    items = query.order_by(CostItem.CodPar).offset(skip).limit(limit).all()
    return total, items

def get_item_by_code(db: Session, item_code: str):
    return db.query(CostItem).filter(CostItem.CodPar == item_code).first()

def get_apu_materials(db: Session, item_code: str):
    return db.query(CostAPUMaterial, CostMaterial)\
        .join(CostMaterial, CostAPUMaterial.CodIns == CostMaterial.CodMat)\
        .filter(CostAPUMaterial.CodPar == item_code).all()

def get_apu_equipments(db: Session, item_code: str):
    return db.query(CostAPUEquipment, CostEquipment)\
        .join(CostEquipment, CostAPUEquipment.CodIns == CostEquipment.CodEqu)\
        .filter(CostAPUEquipment.CodPar == item_code).all()

def get_apu_labors(db: Session, item_code: str):
    return db.query(CostAPULabor, CostLabor)\
        .join(CostLabor, CostAPULabor.CodIns == CostLabor.CodMan)\
        .filter(CostAPULabor.CodPar == item_code).all()

def search_materials_paginated(db: Session, skip: int, limit: int, search: str):
    query = db.query(CostMaterial)
    if search:
        search_term = f"%{search}%"
        query = query.filter(CostMaterial.CodMat.ilike(search_term) | CostMaterial.Descri.ilike(search_term))
    total = query.count()
    items = query.order_by(CostMaterial.CodMat).offset(skip).limit(limit).all()
    return total, items

def search_equipments_paginated(db: Session, skip: int, limit: int, search: str):
    query = db.query(CostEquipment)
    if search:
        search_term = f"%{search}%"
        query = query.filter(CostEquipment.CodEqu.ilike(search_term) | CostEquipment.Descri.ilike(search_term))
    total = query.count()
    items = query.order_by(CostEquipment.CodEqu).offset(skip).limit(limit).all()
    return total, items

def search_labors_paginated(db: Session, skip: int, limit: int, search: str):
    query = db.query(CostLabor)
    if search:
        search_term = f"%{search}%"
        query = query.filter(CostLabor.CodMan.ilike(search_term) | CostLabor.Descri.ilike(search_term))
    total = query.count()
    items = query.order_by(CostLabor.CodMan).offset(skip).limit(limit).all()
    return total, items

def get_categories_tree_data(db: Session):
    items = db.query(CostItem.Categoria, CostItem.TipoActividad).distinct().all()
    tree = {}
    for cat, sub in items:
        if cat:
            if cat not in tree:
                tree[cat] = set()
            if sub:
                tree[cat].add(sub)
                
    result = []
    for cat, subs in tree.items():
        result.append({
            "categoria": cat,
            "actividades": sorted(list(subs))
        })
    return sorted(result, key=lambda x: x["categoria"])

def update_material(db: Session, codigo: str, payload: CostMaterialUpdate):
    mat = db.query(CostMaterial).filter(CostMaterial.CodMat == codigo).first()
    if mat:
        if payload.CosMat is not None:
            mat.CosMat = payload.CosMat
        if payload.Descri is not None:
            mat.Descri = payload.Descri
        db.commit()
        db.refresh(mat)
    return mat

def delete_material(db: Session, codigo: str):
    mat = db.query(CostMaterial).filter(CostMaterial.CodMat == codigo).first()
    if mat:
        db.delete(mat)
        db.commit()
        return True
    return False

def update_equipment(db: Session, codigo: str, payload: CostEquipmentUpdate):
    eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == codigo).first()
    if eq:
        if payload.CosDia is not None:
            eq.CosDia = payload.CosDia
        if payload.Descri is not None:
            eq.Descri = payload.Descri
        db.commit()
        db.refresh(eq)
    return eq

def delete_equipment(db: Session, codigo: str):
    eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == codigo).first()
    if eq:
        db.delete(eq)
        db.commit()
        return True
    return False

def update_labor(db: Session, codigo: str, payload: CostLaborUpdate):
    labor = db.query(CostLabor).filter(CostLabor.CodMan == codigo).first()
    if labor:
        if payload.Jornal is not None:
            labor.Jornal = payload.Jornal
        if payload.Bono is not None:
            labor.Bono = payload.Bono
        if payload.Descri is not None:
            labor.Descri = payload.Descri
        db.commit()
        db.refresh(labor)
    return labor

def delete_labor(db: Session, codigo: str):
    labor = db.query(CostLabor).filter(CostLabor.CodMan == codigo).first()
    if labor:
        db.delete(labor)
        db.commit()
        return True
    return False

def save_custom_apu(db: Session, description: str, unit: str, performance: float, apu_data: str):
    new_item = CustomCostItem(
        id=str(uuid.uuid4()),
        description=description,
        unit=unit,
        performance=performance,
        apu_data=apu_data
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item
