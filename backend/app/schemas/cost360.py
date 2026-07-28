from pydantic import BaseModel
from typing import List

class CostItemBase(BaseModel):
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
    partida: CostItemBase
    materiales: List[APUComponent]
    equipos: List[APUComponent]
    mano_obra: List[APUComponent]
    total_directo: float
