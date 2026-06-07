from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum

class LoadType(str, Enum):
    POINT = "point"
    DISTRIBUTED = "distributed"
    AREA = "area"

class Restraint(BaseModel):
    dofs: List[bool] = Field(default_factory=lambda: [False] * 6)

class Node(BaseModel):
    id: int
    x: float
    y: float
    z: float
    restraint: Optional[Restraint] = None

class Element(BaseModel):
    id: int
    type: str # "frame", "shell"
    nodes: List[int]
    section_id: str
    material_id: str
    beta_angle: float = 0.0

class LoadAssignment(BaseModel):
    id: str
    type: LoadType
    target_id: int # ID del nudo o elemento
    direction: str # "X", "Y", "Z"
    magnitude: float
    load_case: str = "Dead"
    offset: float = 0.5 # Para cargas puntuales en elementos (0 a 1)

class Material(BaseModel):
    id: str
    E: float
    G: float
    nu: float
    density: float

class Section(BaseModel):
    id: str
    A: float
    Ix: float
    Iy: float
    J: float
    params: Dict[str, float] # {"b": 0.3, "h": 0.5}

class Topology(BaseModel):
    nodes: List[Node]
    elements: List[Element]
    materials: List[Material]
    sections: List[Section]
    loads: List[LoadAssignment]

class ProjectResults(BaseModel):
    displacements: Dict[int, List[float]]
    element_forces: Dict[int, Dict]
    design_checks: Dict[int, Dict]