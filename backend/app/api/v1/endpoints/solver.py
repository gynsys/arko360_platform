# arko360_platform/backend/app/api/routes/solver.py
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.v1.endpoints.arko import get_db_session
from app.api.v1.endpoints.arko_app import get_current_user
from app.core.limiter import limiter
from app.db.models.arko import ArkoProject3D, ArkoUser
from app.engine.solvers import StructuralSolver
from app.schemas.fea3d import Topology

router = APIRouter()

logger = logging.getLogger(__name__)


@router.post("/{project_id}/solve")
@limiter.limit("30/minute")
async def submit_solver_job(request: Request, project_id: str, topology: Topology):
    try:
        solver = StructuralSolver(topology)
        results = solver.solve()

        # El solver ahora actúa como función pura, el guardado lo hace el usuario manualmente.

        return {"job_id": project_id, "status": "completed", **results}
    except Exception as e:
        logger.error(f"Solver Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno durante el análisis estructural.")

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, current_user: ArkoUser = Depends(get_current_user)):
    with get_db_session() as db:
        project = db.query(ArkoProject3D).filter(
            ArkoProject3D.id == job_id,
            ArkoProject3D.user_id == current_user.id,
        ).first()
        if not project:
            return {"status": "not_found"}
        if project.results:
            return {"status": "completed", "results": project.results}
        return {"status": "running"}
