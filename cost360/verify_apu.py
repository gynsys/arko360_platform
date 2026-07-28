import os
import sqlite3
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'cost360.db')

def verify():
    conn = sqlite3.connect(DB_PATH)
    
    # Get a random item that has materials, labor, and equipment
    query = """
    SELECT i.CodPar, i.Descri, i.PreUni, i.RenPar
    FROM items i
    WHERE 
        (SELECT COUNT(*) FROM apu_materials WHERE CodPar = i.CodPar) > 0
        AND (SELECT COUNT(*) FROM apu_labor WHERE CodPar = i.CodPar) > 0
    LIMIT 1
    """
    
    item = pd.read_sql(query, conn).iloc[0]
    cod_par = item['CodPar']
    descri = item['Descri']
    pre_uni = float(item['PreUni'])
    ren_par = float(item['RenPar'])
    
    print(f"--- VERIFICACIÓN DE APU ---")
    print(f"Partida: {cod_par} - {descri}")
    print(f"Rendimiento: {ren_par} / Día")
    print(f"Precio Unitario Original (DataLaing): ${pre_uni:.2f}\n")
    
    # 1. Materiales
    query_mat = f"""
    SELECT m.Descri, a.CanIns, m.CosMat, (a.CanIns * m.CosMat) as Subtotal
    FROM apu_materials a
    JOIN materials m ON a.CodIns = m.CodMat
    WHERE a.CodPar = '{cod_par}'
    """
    df_mat = pd.read_sql(query_mat, conn)
    total_mat = df_mat['Subtotal'].sum()
    print("MATERIALES:")
    for _, row in df_mat.iterrows():
        print(f"  - {row['Descri'][:40]}: {row['CanIns']} x ${row['CosMat']:.2f} = ${row['Subtotal']:.2f}")
    print(f"Subtotal Materiales: ${total_mat:.2f}\n")
    
    conn.close()

if __name__ == "__main__":
    verify()
