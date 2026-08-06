import subprocess

cmd = "docker exec -i arko360_platform-db-1 psql -U arko_user -d arko360 -c 'SELECT count(*) FROM cost360_items WHERE \"PreUni\" > 0;'"
out = subprocess.run(["ssh", "-i", "C:/Users/pablo/.ssh/id_ed25519", "root@167.172.115.154", cmd], capture_output=True, text=True)

print("Stdout:", out.stdout)
print("Stderr:", out.stderr)
