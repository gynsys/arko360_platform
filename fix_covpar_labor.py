"""
Fix script:
1. Agrega columna CovPar a cost360_items en PostgreSQL
2. Re-carga cost360_items con CovPar incluido
3. Re-carga cost360_labor con Salari mapeado a Jornal
"""
import os
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://arko_user:arko_password@db:5432/arko360"
CSV_DIR = "/tmp/csvs"
NUMERIC_COLS = {"CosMat", "PreUni", "RenPar", "CanPar", "Cantid",
                "Costo", "Jornal", "Bono", "CosDia", "CostEq", "CanIns", "Desper", "Salari"}


def run() -> None:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("Conexion OK\n")

    # --- 1. Agregar CovPar a cost360_items si no existe ---
    print("-> Verificando columna CovPar en cost360_items...")
    with engine.begin() as conn:
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='cost360_items' AND column_name='CovPar';"
        ))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE cost360_items ADD COLUMN \"CovPar\" VARCHAR;"))
            print("   [OK] Columna CovPar agregada.")
        else:
            print("   [OK] CovPar ya existe.")

    # --- 2. Re-cargar cost360_items con CovPar ---
    print("\n-> Re-cargando cost360_items (con CovPar)...")
    df_items = pd.read_csv(
        os.path.join(CSV_DIR, "Export2024_ObraPart.csv"),
        dtype=str, on_bad_lines="skip", engine="python",
        encoding="utf-8", quotechar='"',
    )
    keep = ["CodPar", "Descri", "CovPar", "UniPar", "PreUni", "RenPar"]
    df_items = df_items[[c for c in keep if c in df_items.columns]].copy()
    for col in df_items.columns:
        if col in NUMERIC_COLS:
            df_items[col] = (
                df_items[col].astype(str).str.replace(",", ".", regex=False)
                .pipe(pd.to_numeric, errors="coerce").fillna(0.0)
            )
    # TRUNCATE items cascade - tambien borra APU (los recargaremos si es necesario)
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE cost360_items CASCADE;"))
    df_items.to_sql("cost360_items", engine, if_exists="append", index=False)
    print(f"   [OK] {len(df_items)} partidas insertadas (con CovPar).")

    # --- 3. Re-cargar APU tables (se borraron por CASCADE) ---
    for csv_file, table, keep_cols in [
        ("Export2024_ObraPainMate.csv", "cost360_apu_materials", ["CodPar", "CodIns", "CanIns", "Desper"]),
        ("Export2024_ObraPainMano.csv", "cost360_apu_labor",     ["CodPar", "CodIns", "CanIns"]),
        ("Export2024_ObraPainEqui.csv", "cost360_apu_equipment", ["CodPar", "CodIns", "CanIns"]),
    ]:
        print(f"\n-> Re-cargando {table}...")
        df = pd.read_csv(
            os.path.join(CSV_DIR, csv_file),
            dtype=str, on_bad_lines="skip", engine="python",
            encoding="utf-8", quotechar='"',
        )
        df = df[[c for c in keep_cols if c in df.columns]].copy()
        for col in df.columns:
            if col in NUMERIC_COLS:
                df[col] = (
                    df[col].astype(str).str.replace(",", ".", regex=False)
                    .pipe(pd.to_numeric, errors="coerce").fillna(0.0)
                )
        with engine.begin() as conn:
            conn.execute(text("SET session_replication_role = replica;"))
            df.to_sql(table, conn, if_exists="append", index=False)
            conn.execute(text("SET session_replication_role = DEFAULT;"))
        print(f"   [OK] {len(df)} registros en {table}.")

    # --- 4. Re-cargar cost360_labor con Salari -> Jornal ---
    print("\n-> Re-cargando cost360_labor (Salari -> Jornal)...")
    df_labor = pd.read_csv(
        os.path.join(CSV_DIR, "Export2024_ObraMano.csv"),
        dtype=str, on_bad_lines="skip", engine="python",
        encoding="utf-8", quotechar='"',
    )
    # Renombrar Salari -> Jornal
    if "Salari" in df_labor.columns:
        df_labor = df_labor.rename(columns={"Salari": "Jornal"})
    keep_labor = ["CodMan", "Descri", "Jornal", "Bono"]
    df_labor = df_labor[[c for c in keep_labor if c in df_labor.columns]].copy()
    for col in df_labor.columns:
        if col in NUMERIC_COLS or col == "Jornal":
            df_labor[col] = (
                df_labor[col].astype(str).str.replace(",", ".", regex=False)
                .pipe(pd.to_numeric, errors="coerce").fillna(0.0)
            )
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE cost360_labor CASCADE;"))
    df_labor.to_sql("cost360_labor", engine, if_exists="append", index=False)
    print(f"   [OK] {len(df_labor)} obreros con Jornal cargados.")

    print("\n=== Fix completado ===")


if __name__ == "__main__":
    run()
