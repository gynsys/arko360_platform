import sys
from ssh_runner import upload_file, run_ssh_command

print("Uploading updated import_cost360.py to VPS /tmp...")
upload_file('backend/scripts/import_cost360.py', '/tmp/import_cost360.py')

print("Copying script into Docker container...")
run_ssh_command('docker cp /tmp/import_cost360.py arko360_platform-backend-1:/app/scripts/import_cost360.py')

print("Creating /app/cost360 in container...")
run_ssh_command('docker exec arko360_platform-backend-1 mkdir -p /app/cost360')

files = ['Export2024_ObraMano.csv', 'Export2024_ObraMate.csv', 'Export2024_ObraEqui.csv', 'Export2024_ObraPart.csv']
for f in files:
    print(f"Uploading {f} to VPS /tmp...")
    upload_file(f'cost360/{f}', f'/tmp/{f}')
    print(f"Copying {f} into Docker container...")
    run_ssh_command(f'docker cp /tmp/{f} arko360_platform-backend-1:/app/cost360/{f}')

print("Executing ETL in Docker container...")
run_ssh_command('docker exec arko360_platform-backend-1 python -u scripts/import_cost360.py')

print("Done!")
