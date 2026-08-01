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
    from collections import defaultdict, Counter
    import statistics
    import json
    from sqlalchemy import or_

    # 1. Buscar partidas similares
    keywords = [w.lower() for w in payload.description.split() if len(w) > 3]
    
    similar_items = []
    if keywords:
        filters = [CostItem.Descri.ilike(f"%{k}%") for k in keywords]
        similar_items = db.query(CostItem).filter(or_(*filters)).limit(15).all()

    # Puntuación de partidas (adaptado de buscar_partidas_por_keywords)
    if similar_items:
        query_words = set(payload.description.lower().split())
        scored = []
        for p in similar_items:
            desc_words = set(p.Descri.lower().split()) if p.Descri else set()
            score = len(query_words & desc_words)
            scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        similar_items = [p for _, p in scored[:10]] # top 10

    modo_fallback = len(similar_items) < 3

    # 2. Calcular estadísticas de insumos
    resultados = {
        "materiales": defaultdict(list),
        "mano_obra": defaultdict(list),
        "equipos": defaultdict(list),
    }

    if not modo_fallback:
        item_codes = [item.CodPar for item in similar_items]
        
        # Necesitamos un diccionario para mapear CodPar a unidad de partida
        unidad_por_partida = {item.CodPar: item.UniPar for item in similar_items}

        mat_rels = db.query(CostAPUMaterial, CostMaterial).join(CostMaterial, CostAPUMaterial.CodIns == CostMaterial.CodMat).filter(CostAPUMaterial.CodPar.in_(item_codes)).all()
        for rel, mat in mat_rels:
            key = f"{mat.Descri.strip() if mat.Descri else ''} | {mat.UniMat.strip() if mat.UniMat else ''}"
            resultados["materiales"][key].append({
                "cantidad": rel.CanIns,
                "unidad_partida": unidad_por_partida.get(rel.CodPar, ""),
                "codigo": mat.CodMat,
            })
            
        eq_rels = db.query(CostAPUEquipment, CostEquipment).join(CostEquipment, CostAPUEquipment.CodIns == CostEquipment.CodEqu).filter(CostAPUEquipment.CodPar.in_(item_codes)).all()
        for rel, eq in eq_rels:
            key = f"{eq.Descri.strip() if eq.Descri else ''} | día"
            resultados["equipos"][key].append({
                "cantidad": rel.CanIns,
                "unidad_partida": unidad_por_partida.get(rel.CodPar, ""),
                "codigo": eq.CodEqu,
            })
            
        mo_rels = db.query(CostAPULabor, CostLabor).join(CostLabor, CostAPULabor.CodIns == CostLabor.CodMan).filter(CostAPULabor.CodPar.in_(item_codes)).all()
        for rel, mo in mo_rels:
            key = f"{mo.Descri.strip() if mo.Descri else ''} | día"
            resultados["mano_obra"][key].append({
                "cantidad": rel.CanIns,
                "unidad_partida": unidad_por_partida.get(rel.CodPar, ""),
                "codigo": mo.CodMan,
            })

    estadisticas = {"materiales": {}, "mano_obra": {}, "equipos": {}}
    for tipo, grupos in resultados.items():
        for key, items in grupos.items():
            cantidades = [i["cantidad"] for i in items if i["cantidad"] and i["cantidad"] > 0]
            if not cantidades:
                continue
            
            unidades_partida = set(i["unidad_partida"] for i in items if i["unidad_partida"])
            inconsistencia_unidad = len(unidades_partida) > 1
            
            estadisticas[tipo][key] = {
                "descripcion": key.split(" | ")[0],
                "unidad": key.split(" | ")[1],
                "min": round(min(cantidades), 4),
                "max": round(max(cantidades), 4),
                "promedio": round(statistics.mean(cantidades), 4),
                "frecuencia": len(cantidades),
                "total_partidas": len(similar_items),
                "porcentaje_presencia": round(len(cantidades) / len(similar_items) * 100, 1),
                "unidades_partida": list(unidades_partida),
                "inconsistencia_unidad": inconsistencia_unidad,
                "codigos": list(set(i["codigo"] for i in items if i["codigo"])),
            }

    # 3. Detectar advertencias
    advertencias_stats = []
    for tipo, grupos in estadisticas.items():
        for key, s in grupos.items():
            if s["promedio"] > 0:
                rango = s["max"] - s["min"]
                if rango > s["promedio"] * 0.5:
                    advertencias_stats.append(
                        f"{tipo.upper()} '{s['descripcion']}': alta variabilidad "
                        f"(min={s['min']}, max={s['max']}, promedio={s['promedio']}). "
                        f"Revisar según condiciones específicas."
                    )
            if s.get("inconsistencia_unidad"):
                advertencias_stats.append(
                    f"{tipo.upper()} '{s['descripcion']}': las partidas históricas usan "
                    f"unidades de partida diferentes: {s['unidades_partida']}. "
                    f"Verificar normalización de cantidades."
                )

    # 4. Filtrar catálogo
    catalogo_materiales = []
    catalogo_equipos = []
    catalogo_mano_obra = []
    
    if not modo_fallback:
        codigos_mat = set()
        codigos_eq = set()
        codigos_mo = set()
        
        for key, s in estadisticas["materiales"].items():
            codigos_mat.update(s.get("codigos", []))
        for key, s in estadisticas["equipos"].items():
            codigos_eq.update(s.get("codigos", []))
        for key, s in estadisticas["mano_obra"].items():
            codigos_mo.update(s.get("codigos", []))
            
        if codigos_mat:
            mats = db.query(CostMaterial).filter(CostMaterial.CodMat.in_(list(codigos_mat))).all()
            catalogo_materiales = [{"codigo": m.CodMat, "descripcion": m.Descri, "unidad": m.UniMat, "precio": m.CosMat} for m in mats]
        if codigos_eq:
            eqs = db.query(CostEquipment).filter(CostEquipment.CodEqu.in_(list(codigos_eq))).all()
            catalogo_equipos = [{"codigo": e.CodEqu, "descripcion": e.Descri, "precio_diario": e.CosDia} for e in eqs]
        if codigos_mo:
            mos = db.query(CostLabor).filter(CostLabor.CodMan.in_(list(codigos_mo))).all()
            catalogo_mano_obra = [{"codigo": m.CodMan, "descripcion": m.Descri, "jornal": m.Jornal} for m in mos]
            
        # Añadir genericos si faltan
        if not catalogo_mano_obra:
             cat_mos = db.query(CostLabor).filter(or_(CostLabor.Descri.ilike("%peón%"), CostLabor.Descri.ilike("%maestro%"))).limit(10).all()
             catalogo_mano_obra = [{"codigo": m.CodMan, "descripcion": m.Descri, "jornal": m.Jornal} for m in cat_mos]
    else:
        if keywords:
            cat_mats = db.query(CostMaterial).filter(or_(*[CostMaterial.Descri.ilike(f"%{k}%") for k in keywords])).limit(20).all()
            catalogo_materiales = [{"codigo": m.CodMat, "descripcion": m.Descri, "unidad": m.UniMat, "precio": m.CosMat} for m in cat_mats]
        
        cat_eqs = db.query(CostEquipment).limit(10).all()
        catalogo_equipos = [{"codigo": e.CodEqu, "descripcion": e.Descri, "precio_diario": e.CosDia} for e in cat_eqs]
        
        cat_mos = db.query(CostLabor).filter(or_(CostLabor.Descri.ilike("%peón%"), CostLabor.Descri.ilike("%maestro%"))).limit(10).all()
        catalogo_mano_obra = [{"codigo": m.CodMan, "descripcion": m.Descri, "jornal": m.Jornal} for m in cat_mos]

    # 5. Armar payload
    rendimientos_formateados = {
        "materiales": [],
        "mano_obra": [],
        "equipos": []
    }

    for tipo, grupos in estadisticas.items():
        for key, s in grupos.items():
            rendimientos_formateados[tipo].append({
                "descripcion": s["descripcion"],
                "unidad": s["unidad"],
                "cantidad_minima": s["min"],
                "cantidad_maxima": s["max"],
                "cantidad_promedio": s["promedio"],
                "frecuencia": f"{s['frecuencia']}/{s['total_partidas']} partidas",
                "porcentaje_presencia": f"{s['porcentaje_presencia']}%",
                "obligatorio": s["porcentaje_presencia"] > 70,
                "opcional": s["porcentaje_presencia"] < 30,
            })

    payload_llm = {
        "modo": "sin_datos_historicos" if modo_fallback else "con_datos_historicos",
        "solicitud_usuario": payload.description,
        "partidas_encontradas": len(similar_items),
        "detalle_partidas": [
            {"codigo": p.CodPar, "descripcion": p.Descri, "unidad": p.UniPar}
            for p in similar_items
        ],
        "rendimientos_historicos": rendimientos_formateados,
        "catalogo_insumos": {
            "materiales": catalogo_materiales,
            "equipos": catalogo_equipos,
            "mano_obra": catalogo_mano_obra
        },
        "advertencias_preprocesamiento": advertencias_stats,
    }

    prompt = f"""
# ROL
Eres un Ingeniero Civil especialista en Análisis de Precios Unitarios (APU). Vas a recibir un payload estructurado generado por el sistema de preprocesamiento, que contiene rendimientos históricos calculados a partir de partidas similares reales, un catálogo de insumos filtrado y advertencias. Tu trabajo es construir un APU técnico y completo basándote estrictamente en esta data.

# PAYLOAD DEL SISTEMA
{json.dumps(payload_llm, ensure_ascii=False)}

# REGLAS DE INTERPRETACIÓN DE HISTORIAL
1. Usa la "cantidad_promedio" como cantidad base para cada insumo.
2. Si la solicitud del usuario difiere de las partidas históricas (espesor, altura, material, condiciones), AJUSTA proporcionalmente y explica en "nota_calculo".
3. Presta especial atención a las "advertencias_preprocesamiento". Si hay advertencias de variabilidad, el promedio puede ser engañoso, usa tu criterio técnico para ajustarlo.
4. Si un insumo es "obligatorio" (presencia > 70%), DEBE incluirse en el APU final. Si es "opcional" (presencia < 30%), inclúyelo solo si es estrictamente necesario para esta partida en particular.
5. Si el historial no tiene datos para un insumo que tú consideras indispensable (ej: no hay clavos para un encofrado), agrégalo con origen "ia" y explica el criterio técnico en la nota de cálculo.

# REGLAS DE INSUMOS
- Usa ÚNICAMENTE insumos del CATÁLOGO proporcionado en el payload.
- Si un insumo indispensable NO está en el catálogo, agrégalo de todas formas, pero:
  * El ID debe empezar con "FALTANTE-" seguido del tipo (ej: FALTANTE-MAT-1)
  * precio_unitario: 0.0
  * origen: "faltante"
  * Agrega una advertencia en el campo "advertencias" del JSON final.
- NUNCA inventes precios para insumos faltantes o estimaciones, usa el precio del catálogo. Si es faltante, el precio es 0.0.
- Herramientas menores y equipos de protección personal: inclúyelos SOLO si representan un impacto medible (>2% del costo directo) o si aparecen consistentemente en el historial.

# REGLAS DE ORIGEN (OBLIGATORIO en cada insumo)
- "historico": Cantidad = tomada directamente del promedio del backend (sin ajustes mayores). Insumo existe en catálogo.
- "ia": Cantidad ajustada/estimada significativamente por ti, o insumo agregado por tu criterio. Insumo existe en catálogo.
- "faltante": Insumo no existe en el catálogo proporcionado. Precio = 0.0.

# MODO FALLBACK
Si el "modo" es "sin_datos_historicos":
- Debes generar el APU por metodología teórica estándar.
- Toda la mano de obra y equipo debe llevar origen "ia".
- Materiales: busca en el catálogo, si lo encuentras usa origen "ia", si no, usa origen "faltante".
- DEBES agregar obligatoriamente una advertencia principal en el JSON final indicando que es un cálculo 100% estimado.

# FORMATO DE SALIDA
Devuelve un JSON estrictamente con la siguiente estructura (NO agregues texto extra antes o después, SOLO EL JSON VÁLIDO):
{{
    "partida": {{"cod_par":"AI-GEN","description":"DESCRIPCIÓN TÉCNICA EN MAYÚSCULAS","unit":"m2","quantity":1.0, "performance": 10.5}},
    "materials": [
        {{"id":"m-1","codigo":"...","descripcion":"...","unidad":"...","cantidad":0.0,"desperdicio":5,"precio_unitario":0.0,"origen":"historico","nota_calculo":"..."}}
    ],
    "equipments": [],
    "labors": [],
    "advertencias": ["string con advertencias que generes o que vengan del preprocesamiento"]
}}
"""
    result = call_llm_json(prompt, use_case="cost360")
    if "advertencias" not in result:
        result["advertencias"] = []
    if advertencias_stats:
        result["advertencias"].extend(advertencias_stats)
        
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
