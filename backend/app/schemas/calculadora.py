from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class LosaCalculationRunBase(BaseModel):
    nombre_proyecto: str
    tipo_losa: str
    inputs: Dict[str, Any]
    resultados: Dict[str, Any]

class LosaCalculationRunCreate(LosaCalculationRunBase):
    pass

class LosaCalculationRunResponse(LosaCalculationRunBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
