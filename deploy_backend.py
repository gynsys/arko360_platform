import subprocess

files_to_upload = [
    ("backend/app/schemas/cost360.py", "/tmp/cost360_schema.py", "arko360_platform-backend-1:/app/app/schemas/cost360.py"),
    ("backend/app/crud/crud_cost360.py", "/tmp/crud_cost360.py", "arko360_platform-backend-1:/app/app/crud/crud_cost360.py"),
    ("backend/app/api/v1/endpoints/cost360.py", "/tmp/cost360_router.py", "arko360_platform-backend-1:/app/app/api/v1/endpoints/cost360.py")
]

for local_path, tmp_path, container_path in files_to_upload:
    print(f"Subiendo {local_path} a VPS...")
    subprocess.run(["python", "ssh_runner.py", "--upload", local_path, tmp_path], check=True)
    print(f"Copiando al contenedor...")
    subprocess.run([
        "ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154",
        f"docker cp {tmp_path} {container_path}"
    ], check=True)

print("Reiniciando contenedor backend...")
subprocess.run([
    "ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154",
    "docker restart arko360_platform-backend-1"
], check=True)

print("¡Backend actualizado en VPS!")
