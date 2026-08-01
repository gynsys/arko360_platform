import sys
sys.path.append('/app/app')
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

db = SessionLocal()
items = db.query(CostItem).filter(CostItem.CodPar.in_(['ECS200', 'V27E27'])).all()
for i in items:
    print(f"[{i.CodPar}] - {i.Descri}")
