import subprocess

files_to_upload = [
    ("backend/app/schemas/cost360.py", "arko360_platform-backend-1", "/app/app/schemas/cost360.py"),
    ("backend/app/crud/crud_cost360.py", "arko360_platform-backend-1", "/app/app/crud/crud_cost360.py"),
    ("backend/app/api/v1/endpoints/cost360.py", "arko360_platform-backend-1", "/app/app/api/v1/endpoints/cost360.py")
]

for local_path, container, remote_path in files_to_upload:
    print(f"Injecting {local_path} directly into {container}:{remote_path} via docker exec...")
    with open(local_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We write it to a temp file on the VPS first, then docker exec cat
    tmp_name = "/tmp/fast_deploy_" + local_path.split("/")[-1]
    
    subprocess.run(["python", "ssh_runner.py", "--upload", local_path, tmp_name], check=True)
    
    ssh_cmd = [
        "ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154",
        f"docker exec {container} sh -c 'cat {tmp_name} > {remote_path}'"
    ]
    # Wait, /tmp/fast_deploy_... is on the HOST, not in the container!
    # So we should use docker exec -i
    # Since ssh_runner is simple, let's just do:
    # cat tmp_name | docker exec -i container sh -c 'cat > remote_path'
    
    ssh_cmd = [
        "ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154",
        f"cat {tmp_name} | docker exec -i {container} sh -c 'cat > {remote_path}'"
    ]
    subprocess.run(ssh_cmd, check=True)

print("Reiniciando contenedor backend...")
subprocess.run([
    "ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154",
    "docker restart arko360_platform-backend-1"
], check=True)

print("¡Backend actualizado RAPIDO en VPS!")
