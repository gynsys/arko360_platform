import sys
import subprocess
import os
import uuid

def run_query(sql_query: str):
    # Generar un nombre temporal unico
    tmp_file = f"query_{uuid.uuid4().hex[:6]}.sql"
    local_path = os.path.join(os.getcwd(), tmp_file)
    remote_path = f"/tmp/{tmp_file}"
    
    # Escribir la query localmente
    with open(local_path, "w", encoding="utf-8") as f:
        f.write(sql_query)
        
    print(f"[*] Subiendo consulta al servidor ({remote_path})...")
    try:
        # Subir el archivo
        subprocess.run(["python", "ssh_runner.py", "--upload", local_path, remote_path], check=True)
        
        # Ejecutar la consulta en Docker usando redireccion de entrada
        print("[*] Ejecutando consulta en PostgreSQL de produccion...")
        cmd = f'docker exec -i arko360_platform-db-1 psql -U arko_user -d arko360 < {remote_path}'
        subprocess.run(["python", "ssh_runner.py", cmd], check=True)
    finally:
        # Limpiar el archivo local
        if os.path.exists(local_path):
            os.remove(local_path)
            
if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Leer desde un archivo si se pasa como argumento
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            sql = f.read()
    else:
        # Leer desde stdin si se usa pipe
        print("Pega tu consulta SQL (Presiona Ctrl+D en Linux o Ctrl+Z en Windows para ejecutar):")
        sql = sys.stdin.read()
        
    if sql.strip():
        run_query(sql)
    else:
        print("La consulta esta vacia.")
