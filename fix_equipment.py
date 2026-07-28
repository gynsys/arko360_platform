import os
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://arko_user:arko_password@db:5432/arko360"
CSV_DIR = "/tmp/csvs"

engine = create_engine(DATABASE_URL)

csv_file = "Export2024_ObraEqui.csv"
df = pd.read_csv(
    os.path.join(CSV_DIR, csv_file),
    dtype=str, on_bad_lines="skip", engine="python",
    encoding="utf-8", quotechar='"'
)

# Fix decimals and calculate CosDia = CosEqu * Deprec
df["CosEqu"] = df["CosEqu"].astype(str).str.replace(",", ".", regex=False).pipe(pd.to_numeric, errors="coerce").fillna(0.0)
df["Deprec"] = df["Deprec"].astype(str).str.replace(",", ".", regex=False).pipe(pd.to_numeric, errors="coerce").fillna(0.0)
df["CosDia"] = df["CosEqu"] * df["Deprec"]

# Filter keep columns
keep_cols = ["CodEqu", "Descri", "CosDia"]
df = df[[c for c in keep_cols if c in df.columns]].copy()

with engine.begin() as conn:
    conn.execute(text("TRUNCATE TABLE cost360_equipment CASCADE;"))
    df.to_sql("cost360_equipment", conn, if_exists="append", index=False)

print(f"[OK] {len(df)} equipos recalculados y cargados.")

# Reload APU Equipments because of CASCADE
csv_apu = "Export2024_ObraPainEqui.csv"
df_apu = pd.read_csv(
    os.path.join(CSV_DIR, csv_apu),
    dtype=str, on_bad_lines="skip", engine="python",
    encoding="utf-8", quotechar='"'
)
df_apu["CanIns"] = df_apu["CanIns"].astype(str).str.replace(",", ".", regex=False).pipe(pd.to_numeric, errors="coerce").fillna(0.0)
df_apu = df_apu[["CodPar", "CodIns", "CanIns"]].copy()

with engine.begin() as conn:
    conn.execute(text("SET session_replication_role = replica;"))
    df_apu.to_sql("cost360_apu_equipment", conn, if_exists="append", index=False)
    conn.execute(text("SET session_replication_role = DEFAULT;"))

print(f"[OK] {len(df_apu)} registros insertados en cost360_apu_equipment")
