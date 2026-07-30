import sqlite3
import pandas as pd

df_dol = pd.read_sql('SELECT * FROM equipment LIMIT 5', sqlite3.connect('cost360dolar.db'))
print('Columnas equipos:', df_dol.columns.tolist())

df_bol = pd.read_sql('SELECT * FROM equipment LIMIT 5', sqlite3.connect('cost360bolivar.db'))

print('\n=== DEPRECIACIÓN EQUIPOS ===')
for i in range(len(df_dol)):
    desc = df_dol['Descri'].iloc[i][:40].ljust(40)
    print(f"{desc} | DOLAR Deprec: {df_dol['Deprec'].iloc[i]} | BOLIVAR Deprec: {df_bol['Deprec'].iloc[i]}")
