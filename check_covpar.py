import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

def main():
    db = SessionLocal()
    items = db.query(CostItem).limit(50).all()
    for i in items:
        print(f'{i.CodPar} - {i.CovPar} - {i.Descri[:30]}')

if __name__ == "__main__":
    main()
