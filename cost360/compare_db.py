import sqlite3
import pandas as pd

def get_sample(db, table, limit=5):
    conn = sqlite3.connect(db)
    df = pd.read_sql(f'SELECT * FROM {table} LIMIT {limit}', conn)
    conn.close()
    return df

print('=== COMPARACIÓN: DÓLARES vs BOLÍVARES ===\n')

print('--- MATERIALES (Costo del Material) ---')
df_dol = get_sample('cost360dolar.db', 'materials')
df_bol = get_sample('cost360bolivar.db', 'materials')
for i in range(len(df_dol)):
    desc = df_dol['Descri'].iloc[i][:40].ljust(40)
    print(f"{desc} | DOLAR: {df_dol['CosMat'].iloc[i]:.2f} | BOLIVAR: {df_bol['CosMat'].iloc[i]:.2f}")

print('\n--- MANO DE OBRA (Jornal) ---')
df_dol_l = get_sample('cost360dolar.db', 'labor')
df_bol_l = get_sample('cost360bolivar.db', 'labor')
for i in range(len(df_dol_l)):
    desc = df_dol_l['Descri'].iloc[i][:40].ljust(40)
    print(f"{desc} | DOLAR: {df_dol_l['Jornal'].iloc[i]:.2f} | BOLIVAR: {df_bol_l['Jornal'].iloc[i]:.2f}")

print('\n--- EQUIPOS (Costo de Equipo) ---')
df_dol_e = get_sample('cost360dolar.db', 'equipment')
df_bol_e = get_sample('cost360bolivar.db', 'equipment')
for i in range(len(df_dol_e)):
    desc = df_dol_e['Descri'].iloc[i][:40].ljust(40)
    print(f"{desc} | DOLAR: {df_dol_e['CostEq'].iloc[i]:.2f} | BOLIVAR: {df_bol_e['CostEq'].iloc[i]:.2f}")
