import sys
from ssh_runner import upload_file, run_ssh_command

print("Uploading cost360.py...")
upload_file('backend/app/api/v1/endpoints/cost360.py', '/tmp/cost360.py')
run_ssh_command('docker cp /tmp/cost360.py arko360_platform-backend-1:/app/app/api/v1/endpoints/cost360.py')

print("Uploading budgets.py...")
upload_file('backend/app/api/v1/endpoints/budgets.py', '/tmp/budgets.py')
run_ssh_command('docker cp /tmp/budgets.py arko360_platform-backend-1:/app/app/api/v1/endpoints/budgets.py')

print("Uploading schemas/cost360.py...")
upload_file('backend/app/schemas/cost360.py', '/tmp/cost360_schema.py')
run_ssh_command('docker cp /tmp/cost360_schema.py arko360_platform-backend-1:/app/app/schemas/cost360.py')

print("Restarting backend...")
run_ssh_command('docker restart arko360_platform-backend-1')
print("Backend deployed!")
