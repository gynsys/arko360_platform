import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem, CostAPUMaterial

def main():
    db = SessionLocal()
    items = db.query(CostItem).filter(CostItem.Descri.ilike("%concreto pobre%")).all()
    print(f'Encontradas {len(items)} partidas con "concreto pobre":')
    for i in items:
        print(f'- [{i.CodPar}] {i.Descri}')
        
    items2 = db.query(CostItem).filter(CostItem.Descri.ilike("%100 kg/cm2%")).all()
    print(f'\nEncontradas {len(items2)} partidas con "100 kg/cm2":')
    for i in items2:
        print(f'- [{i.CodPar}] {i.Descri}')

if __name__ == "__main__":
    main()
