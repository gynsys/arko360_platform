import os
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://arko_user:arko_password@db:5432/arko360"
CSV_DIR = "/tmp/csvs"
NUMERIC_COLS = {"CanIns"}

engine = create_engine(DATABASE_URL)
table = "cost360_apu_labor"
keep_cols = ["CodPar", "CodIns", "CanIns"]
csv_file = "Export2024_ObraPainMano.csv"

df = pd.read_csv(
    os.path.join(CSV_DIR, csv_file),
    dtype=str, on_bad_lines="skip", engine="python",
    encoding="utf-8", quotechar='"'
)
df = df[[c for c in keep_cols if c in df.columns]].copy()
for col in df.columns:
    if col in NUMERIC_COLS:
        df[col] = (
            df[col].astype(str).str.replace(",", ".", regex=False)
            .pipe(pd.to_numeric, errors="coerce").fillna(0.0)
        )
with engine.begin() as conn:
    conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
    conn.execute(text("SET session_replication_role = replica;"))
    df.to_sql(table, conn, if_exists="append", index=False)
    conn.execute(text("SET session_replication_role = DEFAULT;"))
print(f"[OK] {len(df)} registros insertados en {table}")
