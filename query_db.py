import sys
import subprocess

out = subprocess.run(["ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154", "docker exec -i arko360_platform-db-1 psql -U arko -d arko -c \"SELECT \\\"CodPar\\\", \\\"PreUni\\\" FROM cost360_items LIMIT 5;\""], capture_output=True, text=True)
print("Result with arko user:", out.stdout)
print("Error:", out.stderr)

out2 = subprocess.run(["ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154", "docker exec -i arko360_platform-db-1 psql -U postgres -d postgres -c \"SELECT \\\"CodPar\\\", \\\"PreUni\\\" FROM cost360_items LIMIT 5;\""], capture_output=True, text=True)
print("Result with postgres user:", out2.stdout)
print("Error:", out2.stderr)

out3 = subprocess.run(["ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154", "docker exec -i arko360_platform-db-1 psql -U postgres -d arko360_db -c \"SELECT \\\"CodPar\\\", \\\"PreUni\\\" FROM cost360_items LIMIT 5;\""], capture_output=True, text=True)
print("Result with postgres / arko360_db:", out3.stdout)
print("Error:", out3.stderr)
