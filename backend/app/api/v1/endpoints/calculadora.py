from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.arko_base import get_arko_db
from app.db.models.calculadora import LosaCalculationRun
from app.schemas.calculadora import LosaCalculationRunCreate, LosaCalculationRunResponse
from app.core.logging import logger

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
