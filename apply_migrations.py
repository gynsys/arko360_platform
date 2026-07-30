import sys
from ssh_runner import upload_file, run_ssh_command

with open("fix_nulls.py", "w") as f:
    f.write('''
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    conn.execute(text("UPDATE budgets SET exchange_rate = 1.0 WHERE exchange_rate IS NULL;"))
    conn.execute(text("UPDATE budgets SET fcas_percent = 417.0 WHERE fcas_percent IS NULL;"))
    conn.execute(text("UPDATE budgets SET admin_percent = 15.0 WHERE admin_percent IS NULL;"))
    conn.execute(text("UPDATE budgets SET profit_percent = 10.0 WHERE profit_percent IS NULL;"))
    conn.execute(text("UPDATE budgets SET iva_percent = 16.0 WHERE iva_percent IS NULL;"))
    conn.execute(text("UPDATE budgets SET labor_bonus = 0.0 WHERE labor_bonus IS NULL;"))
    conn.execute(text("UPDATE budgets SET material_inflation = 0.0 WHERE material_inflation IS NULL;"))
    conn.execute(text("UPDATE budgets SET labor_inflation = 0.0 WHERE labor_inflation IS NULL;"))
    conn.execute(text("UPDATE budgets SET equipment_inflation = 0.0 WHERE equipment_inflation IS NULL;"))
    conn.commit()
    print("Fixed NULL values successfully.")
''')

print("Uploading fix_nulls.py...")
upload_file('fix_nulls.py', '/tmp/fix_nulls.py')

print("Copying script to container...")
run_ssh_command('docker cp /tmp/fix_nulls.py arko360_platform-backend-1:/app/fix_nulls.py')

print("Executing script...")
run_ssh_command('docker exec arko360_platform-backend-1 python /app/fix_nulls.py')
