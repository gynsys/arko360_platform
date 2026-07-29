from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ================================
# APU Components (Budget specific)
# ================================

class BudgetAPUComponentBase(BaseModel):
    codigo: str
    descripcion: str
    cantidad: float

class BudgetAPUMaterialBase(BudgetAPUComponentBase):
    unidad: str
    precio_unitario: float

class BudgetAPUEquipmentBase(BudgetAPUComponentBase):
    unidad: str
    precio_unitario: float

class BudgetAPULaborBase(BudgetAPUComponentBase):
    jornal: float
    bono: float

# Responses
class BudgetAPUMaterial(BudgetAPUMaterialBase):
    id: str
    budget_item_id: str
    class Config:
        from_attributes = True

class BudgetAPUEquipment(BudgetAPUEquipmentBase):
    id: str
    budget_item_id: str
    class Config:
        from_attributes = True

class BudgetAPULabor(BudgetAPULaborBase):
    id: str
    budget_item_id: str
    class Config:
        from_attributes = True


# ================================
# Budget Items
# ================================

class BudgetItemBase(BaseModel):
    cod_par: str
    cov_par: Optional[str] = None
    description: str
    unit: str
    quantity: float = 0.0
    performance: float = 1.0

class BudgetItemCreate(BudgetItemBase):
    pass

class BudgetItemUpdate(BaseModel):
    quantity: Optional[float] = None
    performance: Optional[float] = None

class BudgetItem(BudgetItemBase):
    id: str
    budget_id: str
    materials: List[BudgetAPUMaterial] = []
    equipments: List[BudgetAPUEquipment] = []
    labors: List[BudgetAPULabor] = []
    class Config:
        from_attributes = True


# ================================
# Budgets
# ================================

class BudgetBase(BaseModel):
    name: str
    description: Optional[str] = None
    company_name: Optional[str] = None
    company_rif: Optional[str] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    currency: str = "USD"
    exchange_rate: float = 1.0
    fcas_percent: float = 417.0
    admin_percent: float = 15.0
    profit_percent: float = 10.0
    iva_percent: float = 16.0

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    company_name: Optional[str] = None
    company_rif: Optional[str] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    currency: Optional[str] = "USD"
    exchange_rate: Optional[float] = 1.0
    fcas_percent: Optional[float] = 417.0
    admin_percent: Optional[float] = 15.0
    profit_percent: Optional[float] = 10.0
    iva_percent: Optional[float] = 16.0

class Budget(BudgetBase):
    id: str
    created_at: datetime
    updated_at: datetime
    items: List[BudgetItem] = []
    class Config:
        from_attributes = True

class BudgetSummary(BudgetBase):
    id: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
