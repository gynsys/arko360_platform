import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://arko_user:arko_password@db:5432/arko360')
print("--- Items (CovPar) ---")
print(pd.read_sql("SELECT \"CodPar\", \"CovPar\" FROM cost360_items WHERE \"CovPar\" IS NOT NULL LIMIT 5", engine))
print("\n--- APU Labor ---")
print(pd.read_sql("SELECT count(*) FROM cost360_apu_labor", engine))
print(pd.read_sql("SELECT * FROM cost360_apu_labor LIMIT 3", engine))
