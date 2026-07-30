import sys
from ssh_runner import upload_file, run_ssh_command

print("Uploading updated run_etl_prod.py to VPS /tmp...")
upload_file('run_etl_prod.py', '/tmp/run_etl_prod.py')

print("Creating /tmp/csvs in container...")
run_ssh_command('docker exec arko360_platform-backend-1 mkdir -p /tmp/csvs')

print("Copying run_etl_prod.py into Docker container...")
run_ssh_command('docker cp /tmp/run_etl_prod.py arko360_platform-backend-1:/tmp/run_etl_prod.py')

files = [
    'Export2024_ObraMano.csv', 
    'Export2024_ObraMate.csv', 
    'Export2024_ObraEqui.csv', 
    'Export2024_ObraPart.csv',
    'Export2024_ObraPainMate.csv',
    'Export2024_ObraPainMano.csv',
    'Export2024_ObraPainEqui.csv'
]

for f in files:
    print(f"Uploading {f} to VPS /tmp...")
    upload_file(f'cost360/{f}', f'/tmp/{f}')
    print(f"Copying {f} into Docker container...")
    run_ssh_command(f'docker cp /tmp/{f} arko360_platform-backend-1:/tmp/csvs/{f}')

print("Executing full ETL in Docker container...")
run_ssh_command('docker exec arko360_platform-backend-1 python -u /tmp/run_etl_prod.py')

print("Done!")
