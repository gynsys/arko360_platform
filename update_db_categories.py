import json
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

def main():
    db = SessionLocal()
    
    # Add columns if they don't exist
    try:
        db.execute(text('ALTER TABLE cost360_items ADD COLUMN "Categoria" VARCHAR;'))
        db.execute(text('ALTER TABLE cost360_items ADD COLUMN "TipoActividad" VARCHAR;'))
        db.commit()
        print("Columns added successfully.")
    except Exception as e:
        db.rollback()
        print("Columns might already exist:", str(e))
    
    # Load mapping
    with open('/app/category_mapping.json', 'r', encoding='utf-8') as f:
        mapping = json.load(f)
        
    print(f"Loaded {len(mapping)} mappings.")
    
    # Bulk update
    count = 0
    for cod_par, data in mapping.items():
        categoria = data.get("categoria")
        subcategoria = data.get("subcategoria")
        if categoria or subcategoria:
            db.query(CostItem).filter(CostItem.CodPar == cod_par).update({
                "Categoria": categoria,
                "TipoActividad": subcategoria
            })
            count += 1
            if count % 1000 == 0:
                db.commit()
                print(f"Updated {count} records...")
                
    db.commit()
    print(f"Finished updating {count} records successfully.")

if __name__ == "__main__":
    main()
