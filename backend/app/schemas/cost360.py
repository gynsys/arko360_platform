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

class CostItemListResponse(BaseModel):
    total: int
    items: List[CostItemBase]

class CostMaterialSchema(BaseModel):
    CodMat: str
    Descri: Optional[str] = None
    UniMat: Optional[str] = None
    CosMat: Optional[float] = None
    class Config: from_attributes = True

class CostEquipmentSchema(BaseModel):
    CodEqu: str
    Descri: Optional[str] = None
    CosDia: Optional[float] = None
    class Config: from_attributes = True

class CostLaborSchema(BaseModel):
    CodMan: str
    Descri: Optional[str] = None
    Jornal: Optional[float] = None
    Bono: Optional[float] = None
    class Config: from_attributes = True

class APUComponent(BaseModel):
    codigo: str
    descripcion: str
    unidad: str
    cantidad: float
    precio_unitario: float
    subtotal: float
    desperdicio: Optional[float] = None
    depreciacion: Optional[float] = None
    jornal: Optional[float] = None
    bono: Optional[float] = None
    tot_jornal: Optional[float] = None
    tot_bono: Optional[float] = None

class APUResponse(BaseModel):
    partida: CostItemBase
    materiales: List[APUComponent]
    equipos: List[APUComponent]
    mano_obra: List[APUComponent]
    total_directo: float

class CostMaterialUpdate(BaseModel):
    CosMat: Optional[float] = None
    Descri: Optional[str] = None

class CostEquipmentUpdate(BaseModel):
    CosDia: Optional[float] = None
    Descri: Optional[str] = None

class CostLaborUpdate(BaseModel):
    Jornal: Optional[float] = None
    Bono: Optional[float] = None
    Descri: Optional[str] = None

class CustomCostItemCreate(BaseModel):
    description: str
    unit: str
    performance: float
    apu_data: str  # JSON encoded string of the APU details

class CustomCostItemResponse(BaseModel):
    id: str
    user_id: Optional[int]
    description: str
    unit: str
    performance: float
    apu_data: str
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class AiApuGenerateRequest(BaseModel):
    description: str
