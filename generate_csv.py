import subprocess
import os

query = """COPY (
    SELECT "CodMat" AS "Codigo", "Descri" AS "Descripcion", "UniMat" AS "Unidad", "CosMat" AS "Precio" 
    FROM cost360_materials 
    WHERE "CodMat" NOT IN (SELECT DISTINCT "CodIns" FROM cost360_apu_materials)
) TO STDOUT WITH CSV HEADER;
"""
with open("tmp_csv_query.sql", "w") as f:
    f.write(query)

print("Subiendo query...")
subprocess.run(["python", "ssh_runner.py", "--upload", "tmp_csv_query.sql", "/tmp/tmp_csv_query.sql"], check=True)

ssh_cmd = [
    "ssh",
    "-i", "C:/Users/pablo/.ssh/id_ed25519",
    "root@167.172.115.154",
    "docker exec -i arko360_platform-db-1 psql -U arko_user -d arko360 < /tmp/tmp_csv_query.sql"
]

print("Ejecutando SSH y capturando CSV...")
result = subprocess.run(ssh_cmd, capture_output=True, text=True)

out_file = r"C:\Users\pablo\.gemini\antigravity\brain\aefe63a9-1fb4-44e5-9f86-730824d62929\materiales_sin_uso.csv"
with open(out_file, "w", encoding="utf-8") as f:
    f.write(result.stdout)
    
print("CSV Creado!")
