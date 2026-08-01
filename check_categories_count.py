import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from sqlalchemy import text

def main():
    db = SessionLocal()
    res = db.execute(text('SELECT COUNT(*) as Total, SUM(CASE WHEN "Categoria" IS NOT NULL THEN 1 ELSE 0 END) as Con_Categoria, SUM(CASE WHEN "Categoria" IS NULL THEN 1 ELSE 0 END) as Sin_Categoria, SUM(CASE WHEN "TipoActividad" IS NOT NULL THEN 1 ELSE 0 END) as Con_Actividad FROM cost360_items;')).fetchone()
    print(f"Total Partidas BD: {res[0]}")
    print(f"Con Categoria: {res[1]}")
    print(f"Sin Categoria: {res[2]}")
    print(f"Con TipoActividad: {res[3]}")

if __name__ == "__main__":
    main()
