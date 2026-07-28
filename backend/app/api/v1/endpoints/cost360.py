from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.base import get_db
from app.db.models.cost360 import (
    CostItem, CostMaterial, CostEquipment, CostLabor,
    CostAPUMaterial, CostAPUEquipment, CostAPULabor
)
from app.schemas.cost360 import CostItemBase, APUResponse, APUComponent

router = APIRouter()

@router.get("/items", response_model=List[CostItemBase])
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
    
    return query.order_by(CostItem.CodPar).offset(skip).limit(limit).all()

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
        subtotal = rel.CanIns * (mat.CosMat or 0.0)
        materiales.append(APUComponent(
            codigo=mat.CodMat,
            descripcion=mat.Descri,
            unidad=mat.UniMat,
            cantidad=rel.CanIns,
            precio_unitario=mat.CosMat or 0.0,
            subtotal=round(subtotal, 2)
        ))

    # Get Equipment
    eq_results = db.query(CostAPUEquipment, CostEquipment)\
        .join(CostEquipment, CostAPUEquipment.CodIns == CostEquipment.CodEqu)\
        .filter(CostAPUEquipment.CodPar == item_code).all()
        
    equipos = []
    for rel, eq in eq_results:
        precio_eq = eq.CosDia if eq.CosDia is not None else 0.0
        subtotal = rel.CanIns * precio_eq
        equipos.append(APUComponent(
            codigo=eq.CodEqu,
            descripcion=eq.Descri,
            unidad="Día",
            cantidad=rel.CanIns,
            precio_unitario=precio_eq,
            subtotal=round(subtotal, 2)
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
