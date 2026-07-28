from sqlalchemy import Column, String, Float, ForeignKey
from app.db.base import Base

class CostItem(Base):
    __tablename__ = "cost360_items"
    CodPar = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    UniPar = Column(String)
    PreUni = Column(Float)
    RenPar = Column(Float)

class CostMaterial(Base):
    __tablename__ = "cost360_materials"
    CodMat = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    UniMat = Column(String)
    CosMat = Column(Float)

class CostLabor(Base):
    __tablename__ = "cost360_labor"
    CodMan = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    Jornal = Column(Float)
    Bono = Column(Float)

class CostEquipment(Base):
    __tablename__ = "cost360_equipment"
    CodEqu = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    CosDia = Column(Float)

class CostAPUMaterial(Base):
    __tablename__ = "cost360_apu_materials"
    CodPar = Column(String, ForeignKey("cost360_items.CodPar"), primary_key=True)
    CodIns = Column(String, ForeignKey("cost360_materials.CodMat"), primary_key=True)
    CanIns = Column(Float)
    Desper = Column(Float)

class CostAPULabor(Base):
    __tablename__ = "cost360_apu_labor"
    CodPar = Column(String, ForeignKey("cost360_items.CodPar"), primary_key=True)
    CodIns = Column(String, ForeignKey("cost360_labor.CodMan"), primary_key=True)
    CanIns = Column(Float)

class CostAPUEquipment(Base):
    __tablename__ = "cost360_apu_equipment"
    CodPar = Column(String, ForeignKey("cost360_items.CodPar"), primary_key=True)
    CodIns = Column(String, ForeignKey("cost360_equipment.CodEqu"), primary_key=True)
    CanIns = Column(Float)
