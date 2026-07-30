import pyodbc
import pandas as pd
import os
import sys

def export_mdb_to_csv(db_path, output_dir):
    try:
        # Connection string for Access Database - trying without prompt
        conn_str = rf'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};Uid=Admin;Pwd=;'
        print(f"Intentando conectar a la base de datos: {db_path}...")
        
        # We can also add autocommit=True or other args but standard is enough if no pass required
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Get all user tables (exclude system tables)
        tables = [row.table_name for row in cursor.tables(tableType='TABLE')]
        print(f"Se encontraron {len(tables)} tablas: {tables}")
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        for table in tables:
            print(f"Exportando tabla: {table} ...")
            df = pd.read_sql(f'SELECT * FROM [{table}]', conn)
            csv_path = os.path.join(output_dir, f"{table}.csv")
            df.to_csv(csv_path, index=False, encoding='utf-8')
            
        print(f"¡Exportación exitosa! Archivos guardados en {output_dir}")
        
    except pyodbc.Error as e:
        error_msg = str(e)
        if "password" in error_msg.lower() or "contraseña" in error_msg.lower() or "not a valid password" in error_msg.lower() or "no es una contraseña válida" in error_msg.lower():
            print("\n[ERROR DE SEGURIDAD] La base de datos está protegida con contraseña.")
            print("No se puede extraer la información sin proporcionar la clave original.")
        else:
            print(f"\n[ERROR] Ocurrió un problema de base de datos: {e}")
    except Exception as e:
        print(f"\n[ERROR] Ocurrió un problema inesperado: {e}")

if __name__ == "__main__":
    db_file = r'C:\Users\pablo\Desktop\base_mayo.mdb'
    out_dir = r'C:\Users\pablo\Desktop\base_mayo_CSV'
    export_mdb_to_csv(db_file, out_dir)
