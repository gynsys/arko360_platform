import sys
sys.path.append('backend')
from app.db.base import SessionLocal
from app.crud.crud_cost360 import get_items_paginated

db = SessionLocal()
total, items = get_items_paginated(
    db=db, 
    skip=0, 
    limit=10, 
    search="alambre", 
    search_desc=False, 
    search_insumos=True
)

print(f"Total coincidencias: {total}")
for i in items:
    print(f"{i['CodPar']} - {i['Descri'][:50]}")
