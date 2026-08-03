import subprocess
import sys

# Ejecutar la migración SQL en el servidor remoto
command = [
    'python', 'ssh_runner.py',
    'cd /var/www/arko360_platform && docker compose exec -T db psql -U arko_user -d arko360 < /dev/stdin << EOF'
]

# Leer el archivo de migración
with open('backend/app/db/migrations/create_cost360_databases_table.sql', 'r') as f:
    sql_content = f.read()

# Ejecutar el comando con el contenido SQL
full_command = f'python ssh_runner.py "cd /var/www/arko360_platform && docker compose exec -T db psql -U arko_user -d arko360" < backend/app/db/migrations/create_cost360_databases_table.sql'

print("Ejecutando migración SQL en el servidor...")
print(full_command)

result = subprocess.run(full_command, shell=True, capture_output=True, text=True)

print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Return code:", result.returncode)

if result.returncode == 0:
    print("✅ Migración ejecutada exitosamente")
else:
    print("❌ Error al ejecutar migración")
    sys.exit(1)
