from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.base import get_db
from app.schemas.cost360 import (
    CostItemListResponse, APUResponse, APUComponent,
    CostMaterialUpdate, CostEquipmentUpdate, CostLaborUpdate,
    AiApuGenerateRequest, CustomCostItemCreate, CustomCostItemResponse
)

# Import Services and CRUD
from app.crud.crud_cost360 import (
    get_items_paginated, get_item_by_code, 
    get_apu_materials, get_apu_equipments, get_apu_labors,
    search_materials_paginated, search_equipments_paginated, search_labors_paginated,
    get_categories_tree_data,
    update_material, delete_material,
    update_equipment, delete_equipment,
    update_labor, delete_labor,
    save_custom_apu
)
from app.services.preprocessing_service import preprocess_apu_data
from app.services.ai_apu_service import generate_apu_with_ai
from app.api.v1.endpoints.arko import get_current_arko_admin

router = APIRouter()

# Write operations on the master cost database are restricted to administrators.
admin_only = Depends(get_current_arko_admin)

@router.get("/items", response_model=CostItemListResponse)
def get_items(skip: int = 0, limit: int = 50, search: Optional[str] = None, chapter: Optional[str] = None, categoria: Optional[str] = None, tipo_actividad: Optional[str] = None, db: Session = Depends(get_db)):
    total, items = get_items_paginated(db, skip, limit, search, chapter, categoria, tipo_actividad)
    return {"total": total, "items": items}

@router.get("/items/{item_code}/apu", response_model=APUResponse)
def get_apu(item_code: str, db: Session = Depends(get_db)):
    item = get_item_by_code(db, item_code)
    if not item:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    mat_results = get_apu_materials(db, item_code)
    materiales = []
    for rel, mat in mat_results:
        desperdicio = rel.Desper if hasattr(rel, 'Desper') and rel.Desper else 0.0
        precio = mat.CosMat or 0.0
        subtotal = rel.CanIns * precio * (1 + (desperdicio / 100.0))
        materiales.append(APUComponent(
            codigo=mat.CodMat, descripcion=mat.Descri, unidad=mat.UniMat, cantidad=rel.CanIns,
            precio_unitario=precio, subtotal=round(subtotal, 2), desperdicio=desperdicio
        ))

    eq_results = get_apu_equipments(db, item_code)
    equipos = []
    for rel, eq in eq_results:
        precio_diario_depreciado = eq.CosDia if eq.CosDia is not None else 0.0
        depreciacion = rel.Deprec if hasattr(rel, 'Deprec') and rel.Deprec else 1.0
        precio_adquisicion = precio_diario_depreciado / depreciacion if depreciacion > 0 else precio_diario_depreciado
        subtotal = rel.CanIns * precio_diario_depreciado
        equipos.append(APUComponent(
            codigo=eq.CodEqu, descripcion=eq.Descri, unidad="Día", cantidad=rel.CanIns,
            precio_unitario=precio_adquisicion, subtotal=round(subtotal, 2), depreciacion=depreciacion
        ))

    mo_results = get_apu_labors(db, item_code)
    mano_obra = []
    for rel, mo in mo_results:
        jornal = mo.Jornal if mo.Jornal is not None else 0.0
        bono = mo.Bono if mo.Bono is not None else 0.0
        tot_jornal = rel.CanIns * jornal
        tot_bono = rel.CanIns * bono
        precio = jornal + bono
        subtotal = tot_jornal + tot_bono
        mano_obra.append(APUComponent(
            codigo=mo.CodMan, descripcion=mo.Descri, unidad="Día", cantidad=rel.CanIns,
            precio_unitario=round(precio, 2), subtotal=round(subtotal, 2),
            jornal=jornal, bono=bono, tot_jornal=round(tot_jornal, 2), tot_bono=round(tot_bono, 2)
        ))

    total_directo = sum(c.subtotal for c in materiales) + sum(c.subtotal for c in equipos) + sum(c.subtotal for c in mano_obra)

    return APUResponse(
        partida=item, materiales=materiales, equipos=equipos, mano_obra=mano_obra, total_directo=round(total_directo, 2)
    )

@router.get("/materials")
def search_materials_route(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    total, items = search_materials_paginated(db, skip, limit, search)
    return {"total": total, "items": items}

@router.get("/equipments")
def search_equipments_route(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    total, items = search_equipments_paginated(db, skip, limit, search)
    return {"total": total, "items": items}

@router.get("/labors")
def search_labors_route(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    total, items = search_labors_paginated(db, skip, limit, search)
    return {"total": total, "items": items}

@router.get("/categories_tree")
def get_categories_tree_route(db: Session = Depends(get_db)):
    return get_categories_tree_data(db)

@router.patch("/materials/{codigo}")
def update_material_route(codigo: str, payload: CostMaterialUpdate, db: Session = Depends(get_db), current_admin=admin_only):
    mat = update_material(db, codigo, payload)
    if not mat: raise HTTPException(status_code=404, detail="Material no encontrado")
    return mat

@router.delete("/materials/{codigo}")
def delete_material_route(codigo: str, db: Session = Depends(get_db), current_admin=admin_only):
    if not delete_material(db, codigo): raise HTTPException(status_code=404, detail="Material no encontrado")
    return {"status": "ok"}

@router.patch("/equipments/{codigo}")
def update_equipment_route(codigo: str, payload: CostEquipmentUpdate, db: Session = Depends(get_db), current_admin=admin_only):
    eq = update_equipment(db, codigo, payload)
    if not eq: raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return eq

@router.delete("/equipments/{codigo}")
def delete_equipment_route(codigo: str, db: Session = Depends(get_db), current_admin=admin_only):
    if not delete_equipment(db, codigo): raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return {"status": "ok"}

@router.patch("/labors/{codigo}")
def update_labor_route(codigo: str, payload: CostLaborUpdate, db: Session = Depends(get_db), current_admin=admin_only):
    labor = update_labor(db, codigo, payload)
    if not labor: raise HTTPException(status_code=404, detail="Mano de obra no encontrada")
    return labor

@router.delete("/labors/{codigo}")
def delete_labor_route(codigo: str, db: Session = Depends(get_db), current_admin=admin_only):
    if not delete_labor(db, codigo): raise HTTPException(status_code=404, detail="Mano de obra no encontrada")
    return {"status": "ok"}

@router.post("/generate-ai-apu")
def generate_ai_apu_route(payload: AiApuGenerateRequest, db: Session = Depends(get_db), current_admin=admin_only):
    # 1. Preprocesamiento (BD + Estadísticas)
    payload_llm = preprocess_apu_data(db, payload.description, payload.categoria, payload.tipo_actividad)
    
    # 1.5. Cortocircuito si hay Match Exacto
    if payload_llm.get("modo") == "partida_exacta_encontrada":
        cod_par = payload_llm.get("partida_exacta_codigo")
        item = get_item_by_code(db, cod_par)
        if item:
            mat_results = get_apu_materials(db, cod_par)
            eq_results = get_apu_equipments(db, cod_par)
            mo_results = get_apu_labors(db, cod_par)
            
            materials = []
            for rel, mat in mat_results:
                materials.append({
                    "id": f"m-{mat.CodMat}",
                    "codigo": mat.CodMat,
                    "descripcion": mat.Descri,
                    "unidad": mat.UniMat,
                    "cantidad": rel.CanIns,
                    "desperdicio": getattr(rel, 'Desper', 0.0) or 0.0,
                    "precio_unitario": mat.CosMat or 0.0,
                    "origen": "historico",
                    "nota_calculo": "Extraído de la base de datos maestra."
                })
            
            equipments = []
            for rel, eq in eq_results:
                equipments.append({
                    "id": f"e-{eq.CodEqu}",
                    "codigo": eq.CodEqu,
                    "descripcion": eq.Descri,
                    "unidad": "día",
                    "cantidad": rel.CanIns,
                    "depreciacion": getattr(rel, 'Deprec', 1.0) or 1.0,
                    "precio_unitario": eq.CosDia or 0.0,
                    "origen": "historico",
                    "nota_calculo": "Extraído de la base de datos maestra."
                })
                
            labors = []
            for rel, mo in mo_results:
                labors.append({
                    "id": f"l-{mo.CodMan}",
                    "codigo": mo.CodMan,
                    "descripcion": mo.Descri,
                    "unidad": "día",
                    "cantidad": rel.CanIns,
                    "jornal": mo.Jornal or 0.0,
                    "bono": mo.Bono or 0.0,
                    "precio_unitario": (mo.Jornal or 0.0) + (mo.Bono or 0.0),
                    "origen": "historico",
                    "nota_calculo": "Extraído de la base de datos maestra."
                })

            return {
                "partida": {
                    "cod_par": item.CodPar,
                    "description": item.Descri,
                    "unit": item.UniPar,
                    "quantity": 1.0,
                    "performance": getattr(item, 'RenPar', 1.0) or 1.0
                },
                "materials": materials,
                "equipments": equipments,
                "labors": labors,
                "advertencias": [
                    f"¡MATCH EXACTO! Ingresaste una descripción idéntica a la partida certificada [{item.CodPar}] de la base de datos. Para evitar distorsionar costos, te hemos entregado el APU original sin usar Inteligencia Artificial."
                ]
            }

    # 2. Generación con IA (LLM Router)
    result = generate_apu_with_ai(payload_llm)
    
    return result

@router.post("/custom-apus", response_model=CustomCostItemResponse)
def save_custom_apu_route(payload: CustomCostItemCreate, db: Session = Depends(get_db), current_admin=admin_only):
    new_item = save_custom_apu(db, payload.description, payload.unit, payload.performance, payload.apu_data)
    return new_item
