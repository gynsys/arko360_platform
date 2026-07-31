from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.base import get_db
from app.db.models.cost360 import (
    CostItem, CostMaterial, CostEquipment, CostLabor,
    CostAPUMaterial, CostAPUEquipment, CostAPULabor
)
from app.schemas.cost360 import (
    CostItemBase, APUResponse, APUComponent, CostItemListResponse,
    CostMaterialSchema, CostEquipmentSchema, CostLaborSchema,
    CostMaterialUpdate, CostEquipmentUpdate, CostLaborUpdate
)

router = APIRouter()

@router.get("/items", response_model=CostItemListResponse)
def get_items(skip: int = 0, limit: int = 50, search: Optional[str] = None, chapter: Optional[str] = None, db: Session = Depends(get_db)):
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
    
    total = query.count()
    items = query.order_by(CostItem.CodPar).offset(skip).limit(limit).all()
    
    return {"total": total, "items": items}

@router.get("/items/{item_code}/apu", response_model=APUResponse)
def get_apu(item_code: str, db: Session = Depends(get_db)):
    item = db.query(CostItem).filter(CostItem.CodPar == item_code).first()
    if not item:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    # Get Materials
    mat_results = db.query(CostAPUMaterial, CostMaterial)\
        .join(CostMaterial, CostAPUMaterial.CodIns == CostMaterial.CodMat)\
        .filter(CostAPUMaterial.CodPar == item_code).all()
        
    materiales = []
    for rel, mat in mat_results:
        desperdicio = rel.Desper if hasattr(rel, 'Desper') and rel.Desper else 0.0
        precio = mat.CosMat or 0.0
        subtotal = rel.CanIns * precio * (1 + (desperdicio / 100.0))
        materiales.append(APUComponent(
            codigo=mat.CodMat,
            descripcion=mat.Descri,
            unidad=mat.UniMat,
            cantidad=rel.CanIns,
            precio_unitario=precio,
            subtotal=round(subtotal, 2),
            desperdicio=desperdicio
        ))

    # Get Equipment
    eq_results = db.query(CostAPUEquipment, CostEquipment)\
        .join(CostEquipment, CostAPUEquipment.CodIns == CostEquipment.CodEqu)\
        .filter(CostAPUEquipment.CodPar == item_code).all()
        
    equipos = []
    for rel, eq in eq_results:
        # En la BD LuloWin exportada, eq.CosDia suele ser el costo diario YA DEPRECIADO por unidad.
        precio_diario_depreciado = eq.CosDia if eq.CosDia is not None else 0.0
        depreciacion = rel.Deprec if hasattr(rel, 'Deprec') and rel.Deprec else 1.0
        
        # Para la interfaz (y coincidir con Maprex), el "Precio" debe ser el Costo de Adquisición Original
        precio_adquisicion = precio_diario_depreciado / depreciacion if depreciacion > 0 else precio_diario_depreciado
        
        # El subtotal es simplemente Cantidad * Costo Diario Depreciado (o Cant * Deprec * Adquisicion)
        subtotal = rel.CanIns * precio_diario_depreciado
        
        equipos.append(APUComponent(
            codigo=eq.CodEqu,
            descripcion=eq.Descri,
            unidad="Día",
            cantidad=rel.CanIns,
            precio_unitario=precio_adquisicion,
            subtotal=round(subtotal, 2),
            depreciacion=depreciacion
        ))

    # Get Labor
    mo_results = db.query(CostAPULabor, CostLabor)\
        .join(CostLabor, CostAPULabor.CodIns == CostLabor.CodMan)\
        .filter(CostAPULabor.CodPar == item_code).all()
        
    mano_obra = []
    for rel, mo in mo_results:
        jornal = mo.Jornal if mo.Jornal is not None else 0.0
        bono = mo.Bono if mo.Bono is not None else 0.0
        tot_jornal = rel.CanIns * jornal
        tot_bono = rel.CanIns * bono
        precio = jornal + bono
        subtotal = tot_jornal + tot_bono
        mano_obra.append(APUComponent(
            codigo=mo.CodMan,
            descripcion=mo.Descri,
            unidad="Día",
            cantidad=rel.CanIns,
            precio_unitario=round(precio, 2),
            subtotal=round(subtotal, 2),
            jornal=jornal,
            bono=bono,
            tot_jornal=round(tot_jornal, 2),
            tot_bono=round(tot_bono, 2)
        ))

    total_directo = sum(c.subtotal for c in materiales) + sum(c.subtotal for c in equipos) + sum(c.subtotal for c in mano_obra)

    return APUResponse(
        partida=item,
        materiales=materiales,
        equipos=equipos,
        mano_obra=mano_obra,
        total_directo=round(total_directo, 2)
    )

@router.get("/materials")
def search_materials(search: str = "", db: Session = Depends(get_db)):
    query = db.query(CostMaterial)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            CostMaterial.CodMat.ilike(search_term) | 
            CostMaterial.Descri.ilike(search_term)
        )
    return query.limit(50).all()

@router.get("/equipments")
def search_equipments(search: str = "", db: Session = Depends(get_db)):
    query = db.query(CostEquipment)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            CostEquipment.CodEqu.ilike(search_term) | 
            CostEquipment.Descri.ilike(search_term)
        )
    return query.limit(50).all()

@router.get("/labors")
def search_labors(search: str = "", db: Session = Depends(get_db)):
    query = db.query(CostLabor)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            CostLabor.CodMan.ilike(search_term) | 
            CostLabor.Descri.ilike(search_term)
        )
    return query.limit(50).all()
@router.patch("/materials/{codigo}")
def update_material(codigo: str, payload: CostMaterialUpdate, db: Session = Depends(get_db)):
    mat = db.query(CostMaterial).filter(CostMaterial.CodMat == codigo).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    if payload.CosMat is not None:
        mat.CosMat = payload.CosMat
    if payload.Descri is not None:
        mat.Descri = payload.Descri
    db.commit()
    db.refresh(mat)
    return mat

@router.delete("/materials/{codigo}")
def delete_material(codigo: str, db: Session = Depends(get_db)):
    mat = db.query(CostMaterial).filter(CostMaterial.CodMat == codigo).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    db.delete(mat)
    db.commit()
    return {"status": "ok"}

@router.patch("/equipments/{codigo}")
def update_equipment(codigo: str, payload: CostEquipmentUpdate, db: Session = Depends(get_db)):
    eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == codigo).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if payload.CosDia is not None:
        eq.CosDia = payload.CosDia
    if payload.Descri is not None:
        eq.Descri = payload.Descri
    db.commit()
    db.refresh(eq)
    return eq

@router.delete("/equipments/{codigo}")
def delete_equipment(codigo: str, db: Session = Depends(get_db)):
    eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == codigo).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    db.delete(eq)
    db.commit()
    return {"status": "ok"}

@router.patch("/labors/{codigo}")
def update_labor(codigo: str, payload: CostLaborUpdate, db: Session = Depends(get_db)):
    labor = db.query(CostLabor).filter(CostLabor.CodMan == codigo).first()
    if not labor:
        raise HTTPException(status_code=404, detail="Mano de obra no encontrada")
    if payload.Jornal is not None:
        labor.Jornal = payload.Jornal
    if payload.Bono is not None:
        labor.Bono = payload.Bono
    if payload.Descri is not None:
        labor.Descri = payload.Descri
    db.commit()
    db.refresh(labor)
    return labor

@router.delete("/labors/{codigo}")
def delete_labor(codigo: str, db: Session = Depends(get_db)):
    labor = db.query(CostLabor).filter(CostLabor.CodMan == codigo).first()
    if not labor:
        raise HTTPException(status_code=404, detail="Mano de obra no encontrada")
    db.delete(labor)
    db.commit()
    return {"status": "ok"}
