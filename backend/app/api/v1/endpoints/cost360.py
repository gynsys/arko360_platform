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
def get_items(skip: int = 0, limit: int = 50, search: Optional[str] = None, chapter: Optional[str] = None, categoria: Optional[str] = None, tipo_actividad: Optional[str] = None, db: Session = Depends(get_db)):
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
    if categoria:
        query = query.filter(CostItem.Categoria == categoria)
    if tipo_actividad:
        query = query.filter(CostItem.TipoActividad == tipo_actividad)
    
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

@router.get("/categories_tree")
def get_categories_tree(db: Session = Depends(get_db)):
    items = db.query(CostItem.Categoria, CostItem.TipoActividad).distinct().all()
    tree = {}
    for cat, sub in items:
        if cat:
            if cat not in tree:
                tree[cat] = set()
            if sub:
                tree[cat].add(sub)
                
    result = []
    for cat, subs in tree.items():
        result.append({
            "categoria": cat,
            "actividades": sorted(list(subs))
        })
    
    return sorted(result, key=lambda x: x["categoria"])

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
    stopwords = {"para", "con", "del", "por", "las", "los", "una", "uno", "como", "sobre"}
    keywords = [w.lower() for w in payload.description.split() if len(w) > 3 and w.lower() not in stopwords]
    
    similar_items = []
    if keywords:
        query = db.query(CostItem)
        if payload.categoria:
            query = query.filter(CostItem.Categoria == payload.categoria)
        if payload.tipo_actividad:
            query = query.filter(CostItem.TipoActividad == payload.tipo_actividad)
            
        filters = [CostItem.Descri.ilike(f"%{k}%") for k in keywords]
        similar_items = query.filter(or_(*filters)).limit(50).all()

    # Puntuación de partidas (Similarity Threshold)
    if similar_items:
        keywords_set = set(keywords)
        scored = []
        for p in similar_items:
            desc_words = set(w.lower() for w in p.Descri.split() if len(w) > 3) if p.Descri else set()
            score = 0
            for kw in keywords_set:
                if any(kw in dw or dw in kw for dw in desc_words):
                    score += 1
            similarity = score / len(keywords_set) if len(keywords_set) > 0 else 0
            if similarity >= 0.25:
                scored.append((similarity, p))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        similar_items = [p for _, p in scored[:10]] # top 10

    modo_fallback = len(similar_items) == 0

    # 2. Calcular estadísticas de insumos
    resultados = {
        "materiales": defaultdict(lambda: defaultdict(list)),
        "mano_obra": defaultdict(lambda: defaultdict(list)),
        "equipos": defaultdict(lambda: defaultdict(list)),
    }

    if not modo_fallback:
        item_codes = [item.CodPar for item in similar_items]
        
        # Necesitamos un diccionario para mapear CodPar a unidad de partida
        unidad_por_partida = {item.CodPar: item.UniPar for item in similar_items}

        mat_rels = db.query(CostAPUMaterial, CostMaterial).join(CostMaterial, CostAPUMaterial.CodIns == CostMaterial.CodMat).filter(CostAPUMaterial.CodPar.in_(item_codes)).all()
        for rel, mat in mat_rels:
            u_partida = unidad_por_partida.get(rel.CodPar, "ND")
            key = f"{mat.Descri.strip() if mat.Descri else ''} | {mat.UniMat.strip() if mat.UniMat else ''}"
            resultados["materiales"][u_partida][key].append({
                "cantidad": rel.CanIns,
                "codigo": mat.CodMat,
            })
            
        eq_rels = db.query(CostAPUEquipment, CostEquipment).join(CostEquipment, CostAPUEquipment.CodIns == CostEquipment.CodEqu).filter(CostAPUEquipment.CodPar.in_(item_codes)).all()
        for rel, eq in eq_rels:
            u_partida = unidad_por_partida.get(rel.CodPar, "ND")
            key = f"{eq.Descri.strip() if eq.Descri else ''} | día"
            resultados["equipos"][u_partida][key].append({
                "cantidad": rel.CanIns,
                "codigo": eq.CodEqu,
            })
            
        mo_rels = db.query(CostAPULabor, CostLabor).join(CostLabor, CostAPULabor.CodIns == CostLabor.CodMan).filter(CostAPULabor.CodPar.in_(item_codes)).all()
        for rel, mo in mo_rels:
            u_partida = unidad_por_partida.get(rel.CodPar, "ND")
            key = f"{mo.Descri.strip() if mo.Descri else ''} | día"
            resultados["mano_obra"][u_partida][key].append({
                "cantidad": rel.CanIns,
                "codigo": mo.CodMan,
            })

    estadisticas = {"materiales": defaultdict(dict), "mano_obra": defaultdict(dict), "equipos": defaultdict(dict)}
    for tipo, grupos_por_unidad in resultados.items():
        for u_partida, grupos_insumos in grupos_por_unidad.items():
            for key, items in grupos_insumos.items():
                cantidades = [i["cantidad"] for i in items if i["cantidad"] and i["cantidad"] > 0]
                if not cantidades:
                    continue
                
                partidas_con_esta_unidad = len([p for p in similar_items if p.UniPar == u_partida or (not p.UniPar and u_partida == "ND")])
                
                estadisticas[tipo][u_partida][key] = {
                    "descripcion": key.split(" | ")[0],
                    "unidad": key.split(" | ")[1],
                    "min": round(min(cantidades), 4),
                    "max": round(max(cantidades), 4),
                    "promedio": round(statistics.mean(cantidades), 4),
                    "frecuencia": len(cantidades),
                    "total_partidas_unidad": partidas_con_esta_unidad,
                    "porcentaje_presencia": round(len(cantidades) / partidas_con_esta_unidad * 100, 1) if partidas_con_esta_unidad > 0 else 0,
                    "codigos": list(set(i["codigo"] for i in items if i["codigo"])),
                }

    # 3. Detectar advertencias
    advertencias_stats = []
    for tipo, grupos_por_unidad in estadisticas.items():
        for u_partida, grupos_insumos in grupos_por_unidad.items():
            for key, s in grupos_insumos.items():
                if s["porcentaje_presencia"] >= 20.0 and s["promedio"] > 0:
                    rango = s["max"] - s["min"]
                    if rango > s["promedio"] * 0.5:
                        advertencias_stats.append(
                            f"{tipo.upper()} '{s['descripcion']}' (para unidad {u_partida}): alta variabilidad "
                            f"(min={s['min']}, max={s['max']}, promedio={s['promedio']}). "
                            f"Revisar según condiciones específicas."
                        )

    # 4. Filtrar catálogo
    catalogo_materiales = []
    catalogo_equipos = []
    catalogo_mano_obra = []
    
    if not modo_fallback:
        codigos_mat = set()
        codigos_eq = set()
        codigos_mo = set()
        
        for u_partida, grupos_insumos in estadisticas["materiales"].items():
            for key, s in grupos_insumos.items():
                if s["porcentaje_presencia"] >= 20.0:
                    codigos_mat.update(s.get("codigos", []))
        for u_partida, grupos_insumos in estadisticas["equipos"].items():
            for key, s in grupos_insumos.items():
                if s["porcentaje_presencia"] >= 20.0:
                    codigos_eq.update(s.get("codigos", []))
        for u_partida, grupos_insumos in estadisticas["mano_obra"].items():
            for key, s in grupos_insumos.items():
                if s["porcentaje_presencia"] >= 20.0:
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
            cat_mats = db.query(CostMaterial).filter(or_(*[CostMaterial.Descri.ilike(f"%{k}%") for k in keywords])).limit(80).all()
            catalogo_materiales = [{"codigo": m.CodMat, "descripcion": m.Descri, "unidad": m.UniMat, "precio": m.CosMat} for m in cat_mats]
        
        cat_eqs = db.query(CostEquipment).limit(20).all()
        catalogo_equipos = [{"codigo": e.CodEqu, "descripcion": e.Descri, "precio_diario": e.CosDia} for e in cat_eqs]
        
        cat_mos = db.query(CostLabor).filter(or_(CostLabor.Descri.ilike("%peón%"), CostLabor.Descri.ilike("%maestro%"), CostLabor.Descri.ilike("%albañil%"))).limit(20).all()
        catalogo_mano_obra = [{"codigo": m.CodMan, "descripcion": m.Descri, "jornal": m.Jornal} for m in cat_mos]

    # 5. Armar payload
    rendimientos_formateados_por_unidad = {}

    for tipo, grupos_por_unidad in estadisticas.items():
        for u_partida, grupos_insumos in grupos_por_unidad.items():
            if u_partida not in rendimientos_formateados_por_unidad:
                rendimientos_formateados_por_unidad[u_partida] = {"materiales": [], "mano_obra": [], "equipos": []}
            
            for key, s in grupos_insumos.items():
                if s["porcentaje_presencia"] >= 20.0:
                    rendimientos_formateados_por_unidad[u_partida][tipo].append({
                        "descripcion": s["descripcion"],
                        "unidad_insumo": s["unidad"],
                        "cantidad_minima": s["min"],
                        "cantidad_maxima": s["max"],
                        "cantidad_promedio": s["promedio"],
                        "frecuencia": f"{s['frecuencia']}/{s['total_partidas_unidad']} partidas",
                        "porcentaje_presencia": f"{s['porcentaje_presencia']}%",
                        "obligatorio": s["porcentaje_presencia"] > 70,
                        "opcional": s["porcentaje_presencia"] <= 70,
                    })

    payload_llm = {
        "modo": "sin_datos_historicos" if modo_fallback else "con_datos_historicos",
        "solicitud_usuario": payload.description,
        "partidas_encontradas": len(similar_items),
        "detalle_partidas": [
            {"codigo": p.CodPar, "descripcion": p.Descri, "unidad": p.UniPar}
            for p in similar_items
        ],
        "rendimientos_historicos_por_unidad_partida": rendimientos_formateados_por_unidad,
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
1. Si el payload contiene múltiples grupos en "rendimientos_historicos_por_unidad_partida" (ej. m2, m3, und), ELIGE la unidad base más lógica para la partida que vas a generar y utiliza EXCLUSIVAMENTE los rendimientos de ese grupo.
2. Usa la "cantidad_promedio" del grupo seleccionado como cantidad base para cada insumo.
3. Si la solicitud del usuario difiere de las partidas históricas, AJUSTA proporcionalmente y explica en "nota_calculo".
4. Presta especial atención a las "advertencias_preprocesamiento". Si hay advertencias de variabilidad, el promedio puede ser engañoso, usa tu criterio técnico para ajustarlo.
4. Si un insumo es "obligatorio" (presencia > 70%), DEBE incluirse en el APU final. Si es "opcional" (presencia < 30%), inclúyelo solo si es estrictamente necesario para esta partida en particular.
5. Si el historial no tiene datos para un insumo que tú consideras indispensable (ej: no hay clavos para un encofrado), agrégalo con origen "ia" y explica el criterio técnico en la nota de cálculo.

# REGLAS DE INSUMOS
- Usa ÚNICAMENTE insumos del CATÁLOGO proporcionado en el payload.
- PROHIBICIÓN ABSOLUTA: Tienes ESTRICTAMENTE PROHIBIDO inventar o "crear" insumos con precios estimados. El origen "faltante" NO ESTÁ PERMITIDO. Todos los insumos del APU deben extraerse del catálogo.
- SUSTITUCIÓN INTELIGENTE: Si el insumo exacto que pide el usuario no existe en el catálogo provisto (ej. pide concreto FC=100 y no hay), DEBES seleccionar el sustituto más cercano y razonable disponible en el catálogo (ej. concreto FC=150) para no distorsionar groseramente el costo.
- ADVERTENCIA OBLIGATORIA: Cada vez que realices una sustitución de este tipo, es OBLIGATORIO que agregues una nota en la matriz de "advertencias" del JSON final, indicando: "No se encontró [Insumo Pedido] en la base de datos. Se utilizó [Insumo Seleccionado] como sustituto temporal para el costeo".
- Herramientas menores y equipos de protección personal: inclúyelos SOLO si representan un impacto medible (>2% del costo directo) o si aparecen consistentemente en el historial.

# REGLAS DE ORIGEN (OBLIGATORIO en cada insumo)
- "historico": Cantidad = tomada directamente del promedio del backend (sin ajustes mayores). Insumo extraído del historial.
- "ia": Cantidad ajustada/estimada significativamente por ti, o insumo agregado por tu criterio/sustitución desde el catálogo.

# MODO FALLBACK
Si el "modo" es "sin_datos_historicos":
- Debes generar el APU por metodología teórica estándar, basándote en tu conocimiento técnico.
- Toda la mano de obra y equipo debe llevar origen "ia". Asegúrate de incluir una cuadrilla completa y realista (ej. maestro, albañiles, peones) y los equipos básicos necesarios, buscándolos EXCLUSIVAMENTE en el catálogo.
- Materiales: busca en el catálogo, usa origen "ia". Aplica la regla de SUSTITUCIÓN INTELIGENTE si no está el exacto.
- DEBES agregar obligatoriamente una advertencia principal en el JSON final indicando que es un cálculo 100% estimado por falta de datos históricos.

# DESCRIPCIÓN DE LA PARTIDA
En el campo "description" de "partida", NO copies simplemente la solicitud del usuario. MEJORA Y EXPANDE la solicitud para crear una descripción técnica profesional, detallada y completa, propia de una norma de medición de ingeniería civil, todo en MAYÚSCULAS (ej. incluir características, acabados, e indicar "INCLUYE MATERIALES, EQUIPOS Y MANO DE OBRA").

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
