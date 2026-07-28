import subprocess
import os

VPS_IP = "167.172.115.154"
SSH_KEY = "C:/Users/pablo/.ssh/id_ed25519"
USER = "root"

print("Comprimiendo backend local...")
subprocess.run(["tar", "-czf", "backend_sync.tar.gz", "-C", "backend", "app", "create_budget_db.py"])

print("Subiendo a VPS...")
subprocess.run(["scp", "-i", SSH_KEY, "backend_sync.tar.gz", f"{USER}@{VPS_IP}:/tmp/backend_sync.tar.gz"])

print("Descomprimiendo en VPS y copiando a volumen...")
cmd = f"""
cd /var/www/arko360_platform/backend && tar -xzf /tmp/backend_sync.tar.gz -C .
docker restart arko360_platform-backend-1
sleep 5
docker exec arko360_platform-backend-1 python /app/create_budget_db.py
"""
subprocess.run(["ssh", "-i", SSH_KEY, f"{USER}@{VPS_IP}", cmd])
print("Sincronización completa.")
