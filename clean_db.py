import sys
from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
from sqlalchemy.orm.attributes import flag_modified

def clean_project():
    db = ArkoSessionLocal()
    run = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto == 'losa flaco3').first()
    if run:
        payload = run.inputs
        canvas_state = payload.get('_canvas_state', {})
        
        internal_walls = canvas_state.get('internalWalls', [])
        clean_walls = [w for w in internal_walls if not (isinstance(w.get('id'), str) and w.get('id').startswith('man_'))]
        
        openings = canvas_state.get('openings', [])
        clean_openings = [op for op in openings if not (isinstance(op.get('wall_id'), str) and op.get('wall_id').startswith('man_'))]
        
        canvas_state['internalWalls'] = clean_walls
        canvas_state['openings'] = clean_openings
        payload['_canvas_state'] = canvas_state
        
        run.inputs = payload
        flag_modified(run, 'inputs')
        db.commit()
        print(f"Cleaned {len(internal_walls) - len(clean_walls)} duplicate walls and {len(openings) - len(clean_openings)} duplicate openings from the database.")
    else:
        print("Project not found in DB.")

if __name__ == "__main__":
    clean_project()
