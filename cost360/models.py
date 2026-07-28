from sqlalchemy import Column, String, Float, Integer, ForeignKey
from database import Base

class Item(Base):
    __tablename__ = "items"
    CodPar = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    UniPar = Column(String)
    PreUni = Column(Float)
    RenPar = Column(Float)

class Material(Base):
    __tablename__ = "materials"
    CodMat = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    UniMat = Column(String)
    CosMat = Column(Float)

class Labor(Base):
    __tablename__ = "labor"
    CodMan = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    Jornal = Column(Float)
    Bono = Column(Float)

class Equipment(Base):
    __tablename__ = "equipment"
    CodEqu = Column(String, primary_key=True, index=True)
    Descri = Column(String)
    CosDia = Column(Float)

class APUMaterial(Base):
    __tablename__ = "apu_materials"
    CodPar = Column(String, ForeignKey("items.CodPar"), primary_key=True)
    CodIns = Column(String, ForeignKey("materials.CodMat"), primary_key=True)
    CanIns = Column(Float)
    Desper = Column(Float)

class APULabor(Base):
    __tablename__ = "apu_labor"
    CodPar = Column(String, ForeignKey("items.CodPar"), primary_key=True)
    CodIns = Column(String, ForeignKey("labor.CodMan"), primary_key=True)
    CanIns = Column(Float)

class APUEquipment(Base):
    __tablename__ = "apu_equipment"
    CodPar = Column(String, ForeignKey("items.CodPar"), primary_key=True)
    CodIns = Column(String, ForeignKey("equipment.CodEqu"), primary_key=True)
    CanIns = Column(Float)
