"""
Mini ETL — solo cost360_apu_materials (la unica que fallo).
"""
import os
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://arko_user:arko_password@db:5432/arko360"
CSV_PATH = "/tmp/csvs/Export2024_ObraPainMate.csv"
TABLE = "cost360_apu_materials"
KEEP_COLS = ["CodPar", "CodIns", "CanIns", "Desper"]
NUMERIC_COLS = {"CanIns", "Desper"}

def run() -> None:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("Conexion OK")

    df = pd.read_csv(
        CSV_PATH, dtype=str, on_bad_lines="skip",
        engine="python", encoding="utf-8", quotechar='"',
    )

    # Filtrar columnas del modelo
    df = df[[c for c in KEEP_COLS if c in df.columns]].copy()

    # Normalizar numericos (coma -> punto)
    for col in df.columns:
        if col in NUMERIC_COLS:
            df[col] = (
                df[col].astype(str)
                .str.replace(",", ".", regex=False)
                .pipe(pd.to_numeric, errors="coerce")
                .fillna(0.0)
            )

    print(f"Filas: {len(df)}, columnas: {list(df.columns)}")

    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {TABLE} CASCADE;"))
        conn.execute(text("SET session_replication_role = replica;"))
        df.to_sql(TABLE, conn, if_exists="append", index=False)
        conn.execute(text("SET session_replication_role = DEFAULT;"))

    print(f"[OK] {len(df)} registros insertados en {TABLE}")

if __name__ == "__main__":
    run()
