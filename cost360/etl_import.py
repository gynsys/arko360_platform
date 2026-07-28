import os
import pandas as pd
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'cost360.db')

def get_csv_path(filename):
    return os.path.join(BASE_DIR, f"Export2024_{filename}.csv")

def run_etl():
    print(f"Iniciando ETL hacia SQLite: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    
    tables_to_import = {
        'ObraMate': 'materials',
        'ObraMano': 'labor',
        'ObraEqui': 'equipment',
        'ObraPart': 'items',
        'ObraPainMate': 'apu_materials',
        'ObraPainMano': 'apu_labor',
        'ObraPainEqui': 'apu_equipment'
    }
    
    for lulo_table, new_table in tables_to_import.items():
        csv_file = get_csv_path(lulo_table)
        if os.path.exists(csv_file):
            print(f"-> Procesando {lulo_table}...")
            try:
                # Read using python engine to handle complex quotes, skipping bad lines
                df = pd.read_csv(csv_file, dtype=str, on_bad_lines='skip', engine='python', encoding='utf-8')
                
                # Cleanup numbers
                for col in df.columns:
                    if col in ['CosMat', 'PreUni', 'RenPar', 'CanPar', 'Cantid', 'Costo', 'Jornal', 'Bono', 'CostEq', 'CanIns']:
                        # Convert comma to dot
                        df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
                
                df.to_sql(new_table, conn, if_exists='replace', index=False)
                print(f"   [OK] {len(df)} registros -> {new_table}")
            except Exception as e:
                print(f"   [ERROR] Falló {lulo_table}: {e}")
        else:
            print(f"-> [!] No se encontró el archivo: {csv_file}")
            
    conn.close()
    print("¡ETL Finalizado con Éxito!")

if __name__ == "__main__":
    run_etl()
