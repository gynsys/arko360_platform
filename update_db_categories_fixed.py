import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

def main():
    db = SessionLocal()
    
    with open('/app/category_mapping_fixed.json', 'r', encoding='utf-8') as f:
        mapping = json.load(f)
        
    print(f"Loaded {len(mapping)} mappings (ignoring BD MAESTRA).")
    
    items = db.query(CostItem).all()
    count_updated = 0
    count_orphans = 0
    
    for item in items:
        if item.CodPar in mapping:
            cat = mapping[item.CodPar].get("categoria")
            if cat == "PETROLERAS":
                cat = "PETROLERA"
            subcat = mapping[item.CodPar].get("subcategoria")
            item.Categoria = cat
            item.TipoActividad = subcat
            count_updated += 1
        else:
            item.Categoria = "GENERAL / SIN CLASIFICAR"
            item.TipoActividad = None
            count_orphans += 1
            
        if (count_updated + count_orphans) % 1000 == 0:
            db.commit()
            print(f"Processed {count_updated + count_orphans} items...")
            
    db.commit()
    print(f"Update complete! {count_updated} items categorized properly. {count_orphans} orphans marked as GENERAL.")

if __name__ == "__main__":
    main()
