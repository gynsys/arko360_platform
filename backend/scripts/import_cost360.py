import os
import sys
import pandas as pd
from sqlalchemy import create_engine

# Add the parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings
from app.db.models.cost360 import (
    CostItem, CostMaterial, CostLabor, CostEquipment,
    CostAPUMaterial, CostAPULabor, CostAPUEquipment
)

# This assumes the CSV files are in the 'cost360' directory at the root of the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_DIR = os.path.join(BASE_DIR, 'cost360')

def get_csv_path(filename):
    return os.path.join(CSV_DIR, f"Export2024_{filename}.csv")

def run_etl():
    print(f"Iniciando ETL hacia PostgreSQL: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    
    tables_to_import = {
        'ObraMate': CostMaterial.__tablename__,
        'ObraMano': CostLabor.__tablename__,
        'ObraEqui': CostEquipment.__tablename__,
        'ObraPart': CostItem.__tablename__,
        'ObraPainMate': CostAPUMaterial.__tablename__,
        'ObraPainMano': CostAPULabor.__tablename__,
        'ObraPainEqui': CostAPUEquipment.__tablename__
    }
    
    for lulo_table, new_table in tables_to_import.items():
        csv_file = get_csv_path(lulo_table)
        if os.path.exists(csv_file):
            print(f"-> Procesando {lulo_table} desde {csv_file}...")
            try:
                # Read using python engine to handle complex quotes, skipping bad lines
                df = pd.read_csv(csv_file, dtype=str, on_bad_lines='skip', engine='python', encoding='utf-8')
                
                # Cleanup numbers
                for col in df.columns:
                    if col in ['CosMat', 'PreUni', 'RenPar', 'CanPar', 'Cantid', 'Costo', 'Jornal', 'Bono', 'CosDia', 'CostEq', 'CanIns']:
                        df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
                
                # If equipment, and column is CosDia, ensure it maps if missing
                if lulo_table == 'ObraEqui' and 'CosDia' not in df.columns and 'CostEq' in df.columns:
                    df['CosDia'] = df['CostEq']
                
                # In PostgreSQL, we can use to_sql with if_exists='replace'
                # but 'replace' drops the table and recreates it without primary keys/foreign keys.
                # So it's better to use 'append' if the tables are already created by Alembic/create_db.py
                # First, clear the table
                from sqlalchemy import text
                with engine.begin() as conn:
                    conn.execute(text(f"TRUNCATE TABLE {new_table} CASCADE;"))
                
                df.to_sql(new_table, engine, if_exists='append', index=False)
                print(f"   [OK] {len(df)} registros insertados en -> {new_table}")
            except Exception as e:
                print(f"   [ERROR] Falló importación de {lulo_table}: {e}")
        else:
            print(f"-> [!] No se encontró el archivo CSV: {csv_file}")

if __name__ == "__main__":
    run_etl()
