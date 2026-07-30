"""
ETL directo a PostgreSQL de produccion.
Ejecutar DENTRO del contenedor backend:
    docker exec arko360_platform-backend-1 python /tmp/run_etl_prod.py
"""
import os
import pandas as pd
from sqlalchemy import create_engine, text

# Credenciales — igual que el .env del backend
# Desde dentro del contenedor "db" es el hostname de postgres
DATABASE_URL = "postgresql://arko_user:arko_password@db:5432/arko360"
CSV_DIR = "/tmp/csvs"

# Mapeo: nombre del CSV -> nombre de tabla en PostgreSQL
TABLES_MAP = {
    "Export2024_ObraMate.csv":     "cost360_materials",
    "Export2024_ObraMano.csv":     "cost360_labor",
    "Export2024_ObraEqui.csv":     "cost360_equipment",
    "Export2024_ObraPart.csv":     "cost360_items",
    "Export2024_ObraPainMate.csv": "cost360_apu_materials",
    "Export2024_ObraPainMano.csv": "cost360_apu_labor",
    "Export2024_ObraPainEqui.csv": "cost360_apu_equipment",
}

# Columnas numericas a normalizar (coma -> punto)
NUMERIC_COLS = {
    "CosMat", "PreUni", "RenPar", "CanPar", "Cantid",
    "Costo", "Jornal", "Bono", "CosDia", "CostEq", "CanIns", "Desper", "Deprec"
}

# Solo estas columnas se insertan — coinciden exactamente con los modelos SQLAlchemy
TABLE_COLUMNS = {
    "cost360_materials":     ["CodMat", "Descri", "UniMat", "CosMat"],
    "cost360_labor":         ["CodMan", "Descri", "Salari"],  # Salari -> mapeado a Jornal
    "cost360_equipment":     ["CodEqu", "Descri", "CosDia"],
    "cost360_items":         ["CodPar", "Descri", "CovPar", "UniPar", "PreUni", "RenPar"],
    "cost360_apu_materials": ["CodPar", "CodIns", "CanIns", "Desper"],
    "cost360_apu_labor":     ["CodPar", "CodIns", "CanIns"],
    "cost360_apu_equipment": ["CodPar", "CodIns", "CanIns", "Deprec"],
}

# Orden respetando FK: maestros primero, APU al final
IMPORT_ORDER = [
    "Export2024_ObraMate.csv",
    "Export2024_ObraMano.csv",
    "Export2024_ObraEqui.csv",
    "Export2024_ObraPart.csv",
    "Export2024_ObraPainMate.csv",
    "Export2024_ObraPainMano.csv",
    "Export2024_ObraPainEqui.csv",
]


def run_etl() -> None:
    print(f"Conectando a: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("Conexion OK\n")

    for csv_file in IMPORT_ORDER:
        table = TABLES_MAP[csv_file]
        csv_path = os.path.join(CSV_DIR, csv_file)
        keep_cols = TABLE_COLUMNS[table]

        if not os.path.exists(csv_path):
            print(f"[!] No encontrado: {csv_path}")
            continue

        print(f"-> Procesando {csv_file} -> {table} ...")
        try:
            df = pd.read_csv(
                csv_path,
                dtype=str,
                on_bad_lines="skip",   # ignora lineas con columnas de mas
                engine="python",
                encoding="utf-8",
                quotechar='"'
            )

            # Reglas especiales por tabla
            if table == "cost360_labor":
                # Renombrar Salari -> Jornal para que coincida con el modelo
                if "Salari" in df.columns:
                    df = df.rename(columns={"Salari": "Jornal"})
            elif table == "cost360_equipment":
                # Calcular CosDia = CosEqu * Deprec ya que CosDia viene vacio en el CSV
                if "CosEqu" in df.columns and "Deprec" in df.columns:
                    df["CosEqu"] = df["CosEqu"].astype(str).str.replace(",", ".", regex=False).pipe(pd.to_numeric, errors="coerce").fillna(0.0)
                    df["Deprec"] = df["Deprec"].astype(str).str.replace(",", ".", regex=False).pipe(pd.to_numeric, errors="coerce").fillna(0.0)
                    df["CosDia"] = df["CosEqu"] * df["Deprec"]

            # Filtrar SOLO columnas del modelo — descartar extras del CSV
            available = [c for c in keep_cols if c in df.columns]
            missing = [c for c in keep_cols if c not in df.columns]
            if missing:
                print(f"   [AVISO] Columnas faltantes en CSV (se omiten): {missing}")
            df = df[available].copy()

            # Normalizar columnas numericas
            for col in df.columns:
                if col in NUMERIC_COLS:
                    df[col] = (
                        df[col].astype(str)
                        .str.replace(",", ".", regex=False)
                        .pipe(pd.to_numeric, errors="coerce")
                        .fillna(0.0)
                    )

            print(f"   Leidas {len(df)} filas, columnas: {list(df.columns)}")

            # Limpiar tabla antes de insertar (CASCADE para respetar FK)
            with engine.begin() as conn:
                conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))

            # Para tablas APU: deshabilitar FK temporalmente (datos huerfanos en CSV origen)
            is_apu = table.startswith("cost360_apu_")
            with engine.begin() as conn:
                if is_apu:
                    conn.execute(text("SET session_replication_role = replica;"))
                df.to_sql(table, conn, if_exists="append", index=False)
                if is_apu:
                    conn.execute(text("SET session_replication_role = DEFAULT;"))
            print(f"   [OK] {len(df)} registros insertados en {table}\n")

        except Exception as e:
            print(f"   [ERROR] {e}\n")

    print("ETL finalizado.")


if __name__ == "__main__":
    run_etl()
