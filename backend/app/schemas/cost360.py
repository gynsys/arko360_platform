from pydantic import BaseModel
from typing import List, Optional

class CostItemBase(BaseModel):
    CodPar: str
    Descri: Optional[str] = None
    CovPar: Optional[str] = None  # Codigo COVENIN
    UniPar: Optional[str] = None
    PreUni: Optional[float] = None
    RenPar: Optional[float] = None

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
