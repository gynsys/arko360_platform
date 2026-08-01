import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem
from sqlalchemy import func

def main():
    db = SessionLocal()
    cats = db.query(CostItem.Categoria, func.count(CostItem.CodPar)).group_by(CostItem.Categoria).order_by(CostItem.Categoria).all()
    print("CATEGORÍAS EN LA BASE DE DATOS:")
    for c, count in cats:
        print(f"- {c}: {count} partidas")

if __name__ == "__main__":
    main()
