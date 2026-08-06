import subprocess
import os

print("1. Compilando frontend admin localmente...")
# We must use shell=True on Windows for npm
subprocess.run("npm run build", shell=True, cwd="admin", check=True)

print("2. Comprimiendo archivos...")
subprocess.run(["tar", "-czvf", "../admin_dist.tar.gz", "dist"], cwd="admin", check=True)

print("3. Subiendo al servidor VPS...")
subprocess.run(["python", "ssh_runner.py", "--upload", "admin_dist.tar.gz", "/tmp/admin_dist.tar.gz"], check=True)

print("4. Descomprimiendo e inyectando en el contenedor Nginx...")
ssh_cmd = [
    "ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154",
    """
    cd /tmp &&
    tar -xzvf admin_dist.tar.gz &&
    docker cp dist/. arko360_platform-admin-frontend-1:/usr/share/nginx/html/ &&
    rm -rf dist admin_dist.tar.gz
    """
]
subprocess.run(ssh_cmd, check=True)

# Clean up local zip
os.remove("admin_dist.tar.gz")

print("¡Frontend Admin actualizado con exito en el VPS sin usar GitHub Actions!")
