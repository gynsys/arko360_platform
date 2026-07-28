"""
Script to diagnose Cost360 DB - checks all 7 tables row counts.
Run: python check_cost360.py
"""
import subprocess

HOST = "root@167.172.115.154"
KEY = "C:/Users/pablo/.ssh/id_ed25519"
CONTAINER = "arko360_platform-db-1"

TABLES = [
    "cost360_items",
    "cost360_materials",
    "cost360_labor",
    "cost360_equipment",
    "cost360_apu_materials",
    "cost360_apu_labor",
    "cost360_apu_equipment",
]

print("\n=== Conteo de filas en todas las tablas Cost360 ===")
for table in TABLES:
    sql = f"SELECT COUNT(*) FROM {table};"
    cmd = ["ssh", "-i", KEY, HOST,
           f"docker exec {CONTAINER} psql -U arko_user -d arko360 -c '{sql}'"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    # Parse the count from output like: "  count\n -------\n   1234\n(1 row)"
    out = result.stdout.strip()
    lines = [l.strip() for l in out.splitlines() if l.strip().isdigit()]
    count = lines[0] if lines else "ERROR"
    print(f"  {table:<35} -> {count} filas")

if result.stderr:
    print(f"\nSTDERR: {result.stderr}")
