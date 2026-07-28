from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

import models, database

app = FastAPI(title="Cost360 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ItemBase(BaseModel):
    CodPar: str
    Descri: str
    UniPar: str
    PreUni: float
    RenPar: float

    class Config:
        from_attributes = True

class APUComponent(BaseModel):
    codigo: str
    descripcion: str
    unidad: str
    cantidad: float
    precio_unitario: float
    subtotal: float

class APUResponse(BaseModel):
    partida: ItemBase
    materiales: List[APUComponent]
    equipos: List[APUComponent]
    mano_obra: List[APUComponent]
    total_directo: float

@app.get("/api/v1/items", response_model=List[ItemBase])
def get_items(skip: int = 0, limit: int = 50, search: str = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Item)
    if search:
        query = query.filter(
            (models.Item.Descri.ilike(f"%{search}%")) | 
            (models.Item.CodPar.ilike(f"%{search}%"))
        )
    return query.offset(skip).limit(limit).all()

@app.get("/api/v1/items/{item_code}/apu", response_model=APUResponse)
def get_apu(item_code: str, db: Session = Depends(database.get_db)):
    item = db.query(models.Item).filter(models.Item.CodPar == item_code).first()
    if not item:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    # Get Materials
    mat_results = db.query(models.APUMaterial, models.Material)\
        .join(models.Material, models.APUMaterial.CodIns == models.Material.CodMat)\
        .filter(models.APUMaterial.CodPar == item_code).all()
        
    materiales = []
    for rel, mat in mat_results:
        subtotal = rel.CanIns * mat.CosMat
        materiales.append(APUComponent(
            codigo=mat.CodMat,
            descripcion=mat.Descri,
            unidad=mat.UniMat,
            cantidad=rel.CanIns,
            precio_unitario=mat.CosMat,
            subtotal=round(subtotal, 2)
        ))

    # Get Equipment
    eq_results = db.query(models.APUEquipment, models.Equipment)\
        .join(models.Equipment, models.APUEquipment.CodIns == models.Equipment.CodEqu)\
        .filter(models.APUEquipment.CodPar == item_code).all()
        
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
    mo_results = db.query(models.APULabor, models.Labor)\
        .join(models.Labor, models.APULabor.CodIns == models.Labor.CodMan)\
        .filter(models.APULabor.CodPar == item_code).all()
        
    mano_obra = []
    for rel, mo in mo_results:
        jornal = mo.Jornal if mo.Jornal is not None else 0.0
        bono = mo.Bono if mo.Bono is not None else 0.0
        precio = jornal + bono
        subtotal = rel.CanIns * precio
        mano_obra.append(APUComponent(
            codigo=mo.CodMan,
            descripcion=mo.Descri,
            unidad="Día",
            cantidad=rel.CanIns,
            precio_unitario=round(precio, 2),
            subtotal=round(subtotal, 2)
        ))

    total_directo = sum(c.subtotal for c in materiales) + sum(c.subtotal for c in equipos) + sum(c.subtotal for c in mano_obra)

    return APUResponse(
        partida=item,
        materiales=materiales,
        equipos=equipos,
        mano_obra=mano_obra,
        total_directo=round(total_directo, 2)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
