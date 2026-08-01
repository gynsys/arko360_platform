import csv
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

def main():
    db = SessionLocal()
    items = db.query(CostItem).order_by(CostItem.CodPar).all()
    
    with open('/app/export_partidas.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(['No.', 'Referencia', 'Código', 'Descripción', 'Unidad', 'RENDIMIENTO', 'CATEGORIA', 'SUB CATEGORIA'])
        
        for idx, item in enumerate(items, start=1):
            writer.writerow([
                idx,
                item.CodPar or '',
                item.CovPar or '',
                item.Descri or '',
                item.UniPar or '',
                item.RenPar or '',
                item.Categoria or '',
                item.TipoActividad or ''
            ])
            
    print(f"Exported {len(items)} items to /app/export_partidas.csv")

if __name__ == "__main__":
    main()
