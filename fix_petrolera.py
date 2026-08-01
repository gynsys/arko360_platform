import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

def main():
    db = SessionLocal()
    count = db.query(CostItem).filter(CostItem.Categoria == 'PETROLERAS').update({'Categoria': 'PETROLERA'}, synchronize_session=False)
    db.commit()
    print(f"Unificadas {count} partidas de PETROLERAS a PETROLERA.")

if __name__ == "__main__":
    main()
