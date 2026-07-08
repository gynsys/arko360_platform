from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.arko_base import get_arko_db
from app.db.models.calculadora import LosaCalculationRun
from app.schemas.calculadora import (
    LosaCalculationRunCreate, LosaCalculationRunResponse,
    SlabModelInput
)
from app.core.logging import logger
from app.engine.FoundationSlabDesigner import FoundationSlabDesigner

router = APIRouter()

@router.post("/runs", response_model=LosaCalculationRunResponse)
def create_run(run_in: LosaCalculationRunCreate, db: Session = Depends(get_arko_db)):
    """
    Guarda una nueva corrida de cálculo en el historial.
    """
    try:
        new_run = LosaCalculationRun(
            nombre_proyecto=run_in.nombre_proyecto,
            tipo_losa=run_in.tipo_losa,
            inputs=run_in.inputs,
            resultados=run_in.resultados
        )
        db.add(new_run)
        db.commit()
        db.refresh(new_run)
        return new_run
    except Exception as e:
        logger.error(f"Error al guardar la corrida: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno al guardar los datos.")

@router.get("/runs", response_model=List[LosaCalculationRunResponse])
def get_runs(db: Session = Depends(get_arko_db)):
    """
    Obtiene el historial global de corridas (ordenadas de la más reciente a la más antigua).
    """
    try:
        runs = db.query(LosaCalculationRun).order_by(LosaCalculationRun.created_at.desc()).all()
        return runs
    except Exception as e:
        logger.error(f"Error al obtener historial: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al obtener el historial.")

@router.get("/runs/{run_id}", response_model=LosaCalculationRunResponse)
def get_run(run_id: int, db: Session = Depends(get_arko_db)):
    """
    Obtiene una corrida específica por su ID.
    """
    try:
        run = db.query(LosaCalculationRun).filter(LosaCalculationRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Corrida no encontrada.")
        return run
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener corrida {run_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al obtener los datos.")

@router.put("/runs/{run_id}", response_model=LosaCalculationRunResponse)
def update_run(run_id: int, run_in: LosaCalculationRunCreate, db: Session = Depends(get_arko_db)):
    """
    Actualiza una corrida específica por su ID.
    """
    try:
        run = db.query(LosaCalculationRun).filter(LosaCalculationRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Corrida no encontrada.")
        
        run.nombre_proyecto = run_in.nombre_proyecto
        run.tipo_losa = run_in.tipo_losa
        run.inputs = run_in.inputs
        run.resultados = run_in.resultados
        
        db.commit()
        db.refresh(run)
        return run
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar corrida {run_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno al actualizar.")

@router.delete("/runs/{run_id}")
def delete_run(run_id: int, db: Session = Depends(get_arko_db)):
    """
    Elimina una corrida específica por su ID.
    """
    try:
        run = db.query(LosaCalculationRun).filter(LosaCalculationRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Corrida no encontrada.")
        
        db.delete(run)
        db.commit()
        return {"ok": True, "message": "Corrida eliminada correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar corrida {run_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno al eliminar.")

@router.post("/losa_fundacion/analyze")
def analyze_slab(data: SlabModelInput):
    """
    Recibe modelo de losa desde React, ejecuta FEM y devuelve resultados + SVG.
    """
    try:
        mat = data.materials
        gr = FoundationSlabDesigner(
            Lx=data.geometry.Lx, Ly=data.geometry.Ly, h=data.geometry.h,
            E=mat.E, nu=mat.nu, k=mat.k, f_c=mat.f_c, f_y=mat.f_y,
            cover=mat.cover, bar_diam=mat.bar_diam,
            gamma_horm=mat.gamma_horm, include_self_weight=True, lambda_aci=1.0,
            band_width_factor=data.band_width_factor,
            max_settlement_ratio=data.max_settlement_ratio,
            q_adm=mat.q_adm,
            band_width_m=mat.band_width_m,
            custom_mesh_cm2_m=mat.custom_mesh_cm2_m
        )
        gr.set_mesh(nx=data.mesh_nx, ny=data.mesh_ny)

        for w in data.walls:
            openings_dicts = [op.model_dump() if hasattr(op, 'model_dump') else op.dict() for op in w.openings] if w.openings else None
            gr.add_wall(w.x1, w.y1, w.x2, w.y2, w.thickness, w.height, w.density, w.load_factor, w.type, is_plastered=w.is_plastered, openings=openings_dicts)
        for b in data.beams:
            gr.add_beam(b.x1, b.y1, b.x2, b.y2, b.width, b.height, b.load_factor, b.type)
        for c in data.columns:
            gr.add_column(c.x, c.y, c.width, c.length, c.height, c.load_kgf, c.id)

        results = gr.run_full_analysis(extra_uniform_load=data.extra_load)
        return results
    except Exception as e:
        logger.error(f"Error en analyze_slab: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno durante el análisis FEM.")

