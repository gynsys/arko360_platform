from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.base import get_db
from app.db.models.cost360 import (
    CostItem, CostMaterial, CostEquipment, CostLabor,
    CostAPUMaterial, CostAPUEquipment, CostAPULabor, CustomCostItem
)
from app.schemas.cost360 import (
    CostItemBase, APUResponse, APUComponent, CostItemListResponse,
    CostMaterialSchema, CostEquipmentSchema, CostLaborSchema,
    CostMaterialUpdate, CostEquipmentUpdate, CostLaborUpdate,
    AiApuGenerateRequest, CustomCostItemCreate, CustomCostItemResponse
)
from app.services.llm_router import call_llm_json
import json
from sqlalchemy import func, or_

router = APIRouter()

@router.get("/items", response_model=CostItemListResponse)
def get_items(skip: int = 0, limit: int = 50, search: Optional[str] = None, chapter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(CostItem)
    if search:
        words = search.split()
        for word in words:
            query = query.filter(
                (CostItem.Descri.ilike(f"%{word}%")) | 
                (CostItem.CodPar.ilike(f"%{word}%")) |
                (CostItem.CovPar.ilike(f"%{word}%"))
            )
    if chapter:
        query = query.filter(CostItem.CodPar.startswith(chapter))
    
    total = query.count()
    items = query.order_by(CostItem.CodPar).offset(skip).limit(limit).all()
    
    return {"total": total, "items": items}

@router.get("/items/{item_code}/apu", response_model=APUResponse)
def get_apu(item_code: str, db: Session = Depends(get_db)):
    item = db.query(CostItem).filter(CostItem.CodPar == item_code).first()
    if not item:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    # Get Materials
    mat_results = db.query(CostAPUMaterial, CostMaterial)\
        .join(CostMaterial, CostAPUMaterial.CodIns == CostMaterial.CodMat)\
        .filter(CostAPUMaterial.CodPar == item_code).all()
        
    materiales = []
    for rel, mat in mat_results:
        desperdicio = rel.Desper if hasattr(rel, 'Desper') and rel.Desper else 0.0
        precio = mat.CosMat or 0.0
        subtotal = rel.CanIns * precio * (1 + (desperdicio / 100.0))
        materiales.append(APUComponent(
            codigo=mat.CodMat,
            descripcion=mat.Descri,
            unidad=mat.UniMat,
            cantidad=rel.CanIns,
            precio_unitario=precio,
            subtotal=round(subtotal, 2),
            desperdicio=desperdicio
        ))

    # Get Equipment
    eq_results = db.query(CostAPUEquipment, CostEquipment)\
        .join(CostEquipment, CostAPUEquipment.CodIns == CostEquipment.CodEqu)\
        .filter(CostAPUEquipment.CodPar == item_code).all()
        
    equipos = []
    for rel, eq in eq_results:
        # En la BD LuloWin exportada, eq.CosDia suele ser el costo diario YA DEPRECIADO por unidad.
        precio_diario_depreciado = eq.CosDia if eq.CosDia is not None else 0.0
        depreciacion = rel.Deprec if hasattr(rel, 'Deprec') and rel.Deprec else 1.0
        
        # Para la interfaz (y coincidir con Maprex), el "Precio" debe ser el Costo de Adquisición Original
        precio_adquisicion = precio_diario_depreciado / depreciacion if depreciacion > 0 else precio_diario_depreciado
        
        # El subtotal es simplemente Cantidad * Costo Diario Depreciado (o Cant * Deprec * Adquisicion)
        subtotal = rel.CanIns * precio_diario_depreciado
        
        equipos.append(APUComponent(
            codigo=eq.CodEqu,
            descripcion=eq.Descri,
            unidad="Día",
            cantidad=rel.CanIns,
            precio_unitario=precio_adquisicion,
            subtotal=round(subtotal, 2),
            depreciacion=depreciacion
        ))

    # Get Labor
    mo_results = db.query(CostAPULabor, CostLabor)\
        .join(CostLabor, CostAPULabor.CodIns == CostLabor.CodMan)\
        .filter(CostAPULabor.CodPar == item_code).all()
        
    mano_obra = []
    for rel, mo in mo_results:
        jornal = mo.Jornal if mo.Jornal is not None else 0.0
        bono = mo.Bono if mo.Bono is not None else 0.0
        tot_jornal = rel.CanIns * jornal
        tot_bono = rel.CanIns * bono
        precio = jornal + bono
        subtotal = tot_jornal + tot_bono
        mano_obra.append(APUComponent(
            codigo=mo.CodMan,
            descripcion=mo.Descri,
            unidad="Día",
            cantidad=rel.CanIns,
            precio_unitario=round(precio, 2),
            subtotal=round(subtotal, 2),
            jornal=jornal,
            bono=bono,
            tot_jornal=round(tot_jornal, 2),
            tot_bono=round(tot_bono, 2)
        ))

    total_directo = sum(c.subtotal for c in materiales) + sum(c.subtotal for c in equipos) + sum(c.subtotal for c in mano_obra)

    return APUResponse(
        partida=item,
        materiales=materiales,
        equipos=equipos,
        mano_obra=mano_obra,
        total_directo=round(total_directo, 2)
    )

@router.get("/materials")
def search_materials(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    query = db.query(CostMaterial)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            CostMaterial.CodMat.ilike(search_term) | 
            CostMaterial.Descri.ilike(search_term)
        )
    total = query.count()
    items = query.order_by(CostMaterial.CodMat).offset(skip).limit(limit).all()
    return {"total": total, "items": items}

@router.get("/equipments")
def search_equipments(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    query = db.query(CostEquipment)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            CostEquipment.CodEqu.ilike(search_term) | 
            CostEquipment.Descri.ilike(search_term)
        )
    total = query.count()
    items = query.order_by(CostEquipment.CodEqu).offset(skip).limit(limit).all()
    return {"total": total, "items": items}

@router.get("/labors")
def search_labors(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    query = db.query(CostLabor)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            CostLabor.CodMan.ilike(search_term) | 
            CostLabor.Descri.ilike(search_term)
        )
    total = query.count()
    items = query.order_by(CostLabor.CodMan).offset(skip).limit(limit).all()
    return {"total": total, "items": items}
@router.patch("/materials/{codigo}")
def update_material(codigo: str, payload: CostMaterialUpdate, db: Session = Depends(get_db)):
    mat = db.query(CostMaterial).filter(CostMaterial.CodMat == codigo).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    if payload.CosMat is not None:
        mat.CosMat = payload.CosMat
    if payload.Descri is not None:
        mat.Descri = payload.Descri
    db.commit()
    db.refresh(mat)
    return mat

@router.delete("/materials/{codigo}")
def delete_material(codigo: str, db: Session = Depends(get_db)):
    mat = db.query(CostMaterial).filter(CostMaterial.CodMat == codigo).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    db.delete(mat)
    db.commit()
    return {"status": "ok"}

@router.patch("/equipments/{codigo}")
def update_equipment(codigo: str, payload: CostEquipmentUpdate, db: Session = Depends(get_db)):
    eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == codigo).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if payload.CosDia is not None:
        eq.CosDia = payload.CosDia
    if payload.Descri is not None:
        eq.Descri = payload.Descri
    db.commit()
    db.refresh(eq)
    return eq

@router.delete("/equipments/{codigo}")
def delete_equipment(codigo: str, db: Session = Depends(get_db)):
    eq = db.query(CostEquipment).filter(CostEquipment.CodEqu == codigo).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    db.delete(eq)
    db.commit()
    return {"status": "ok"}

@router.patch("/labors/{codigo}")
def update_labor(codigo: str, payload: CostLaborUpdate, db: Session = Depends(get_db)):
    labor = db.query(CostLabor).filter(CostLabor.CodMan == codigo).first()
    if not labor:
        raise HTTPException(status_code=404, detail="Mano de obra no encontrada")
    if payload.Jornal is not None:
        labor.Jornal = payload.Jornal
    if payload.Bono is not None:
        labor.Bono = payload.Bono
    if payload.Descri is not None:
        labor.Descri = payload.Descri
    db.commit()
    db.refresh(labor)
    return labor

@router.delete("/labors/{codigo}")
def delete_labor(codigo: str, db: Session = Depends(get_db)):
    labor = db.query(CostLabor).filter(CostLabor.CodMan == codigo).first()
    if not labor:
        raise HTTPException(status_code=404, detail="Mano de obra no encontrada")
    db.delete(labor)
    db.commit()
    return {"status": "ok"}

@router.post("/generate-ai-apu")
def generate_ai_apu(payload: AiApuGenerateRequest, db: Session = Depends(get_db)):
    # 1. Extraer palabras clave largas para buscar insumos (omitir palabras cortas como 'de', 'con', etc.)
    keywords = [w.lower() for w in payload.description.split() if len(w) > 3]
    
    # Materiales relevantes
    mat_query = []
    if keywords:
        mat_query = db.query(CostMaterial).filter(
            or_(*[CostMaterial.Descri.ilike(f"%{k}%") for k in keywords])
        ).limit(30).all()
        
    mat_ids = [m.CodMat for m in mat_query]
    yields_dict = {}
    if mat_ids:
        yields_mat = db.query(CostAPUMaterial.CodIns, func.avg(CostAPUMaterial.CanIns).label("avg_cant")).filter(CostAPUMaterial.CodIns.in_(mat_ids)).group_by(CostAPUMaterial.CodIns).all()
        yields_dict = {y.CodIns: y.avg_cant for y in yields_mat}

    context_materiales = []
    for m in mat_query:
        context_materiales.append({
            "codigo": m.CodMat, 
            "descripcion": m.Descri, 
            "unidad": m.UniMat, 
            "precio": m.CosMat,
            "rendimiento_historico_promedio": yields_dict.get(m.CodMat, None)
        })

    # Equipos relevantes (búsqueda general pequeña para dar contexto o palabras clave si aplica)
    eq_query = db.query(CostEquipment).limit(20).all()
    eq_ids = [e.CodEqu for e in eq_query]
    eq_yields_dict = {}
    if eq_ids:
        yields_eq = db.query(CostAPUEquipment.CodIns, func.avg(CostAPUEquipment.CanIns).label("avg_cant")).filter(CostAPUEquipment.CodIns.in_(eq_ids)).group_by(CostAPUEquipment.CodIns).all()
        eq_yields_dict = {y.CodIns: y.avg_cant for y in yields_eq}
        
    context_equipos = []
    for e in eq_query:
        context_equipos.append({
            "codigo": e.CodEqu,
            "descripcion": e.Descri,
            "precio_diario": e.CosDia,
            "rendimiento_historico_promedio": eq_yields_dict.get(e.CodEqu, None)
        })

    # Mano de obra relevante
    mo_query = db.query(CostLabor).limit(20).all()
    mo_ids = [m.CodMan for m in mo_query]
    mo_yields_dict = {}
    if mo_ids:
        yields_mo = db.query(CostAPULabor.CodIns, func.avg(CostAPULabor.CanIns).label("avg_cant")).filter(CostAPULabor.CodIns.in_(mo_ids)).group_by(CostAPULabor.CodIns).all()
        mo_yields_dict = {y.CodIns: y.avg_cant for y in yields_mo}
        
    context_mano_obra = []
    for m in mo_query:
        context_mano_obra.append({
            "codigo": m.CodMan,
            "descripcion": m.Descri,
            "jornal": m.Jornal,
            "rendimiento_historico_promedio": mo_yields_dict.get(m.CodMan, None)
        })

    context = {
        "catalogo_materiales": context_materiales,
        "catalogo_equipos": context_equipos,
        "catalogo_mano_obra": context_mano_obra
    }
    
    prompt = f"""
Eres un ingeniero civil experto calculando Análisis de Precios Unitarios (APU).
El usuario necesita un APU para la siguiente partida: "{payload.description}"

INSTRUCCIONES CRÍTICAS:
1. Utiliza ESTRICTAMENTE los códigos, descripciones y precios del catálogo proporcionado abajo.
2. Para las cantidades (rendimientos), si el catálogo incluye un "rendimiento_historico_promedio", úsalo y marca el campo "origen" como "historico".
3. Si el insumo no tiene rendimiento histórico, asume uno basado en la ingeniería y marca "origen" como "ia".
4. Si extraes un insumo tal cual del catálogo, pon "origen" como "catalogo".
5. Los IDs deben ser UUIDs cortos aleatorios que inventes (ej. 'mat-1', 'eq-2').

Catálogo disponible (SOLO USA ESTOS INSUMOS):
{json.dumps(context)}

Devuelve un JSON estrictamente con la siguiente estructura (NO AGREGUES TEXTO EXTRA):
{{
    "partida": {{
        "cod_par": "AI-GEN",
        "description": "{payload.description}",
        "unit": "m2",
        "performance": 1.0,
        "quantity": 1.0
    }},
    "materials": [
        {{ "id": "m-1", "codigo": "CodMat", "descripcion": "Desc", "unidad": "m", "cantidad": 0.5, "desperdicio": 5, "precio_unitario": 10.0, "origen": "historico" }}
    ],
    "equipments": [
        {{ "id": "e-1", "codigo": "CodEqu", "descripcion": "Desc", "cantidad": 0.1, "depreciacion": 1.0, "precio_unitario": 50.0, "origen": "ia" }}
    ],
    "labors": [
        {{ "id": "l-1", "codigo": "CodMan", "descripcion": "Desc", "cantidad": 0.1, "jornal": 15.0, "origen": "historico" }}
    ]
}}
"""
    
    result = call_llm_json(prompt, use_case="cost360")
    return result

@router.post("/custom-apus", response_model=CustomCostItemResponse)
def save_custom_apu(payload: CustomCostItemCreate, db: Session = Depends(get_db)):
    import uuid
    new_item = CustomCostItem(
        id=str(uuid.uuid4()),
        description=payload.description,
        unit=payload.unit,
        performance=payload.performance,
        apu_data=payload.apu_data
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item
