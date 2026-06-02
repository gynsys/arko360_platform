import os
import subprocess

repo_dir = r"C:\Users\pablo\Documents\arko360_platform"

# Remove .git to start fresh
subprocess.run(["powershell", "-Command", "Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue"], cwd=repo_dir)

# Create proper .gitignore
gitignore_content = """
node_modules/
dist/
__pycache__/
.venv/
.env
"""

with open(os.path.join(repo_dir, ".gitignore"), "w", encoding="utf-8") as f:
    f.write(gitignore_content)

# Run git commands
commands = [
    ["git", "init"],
    ["git", "add", "."],
    ["git", "commit", "-m", "Initial commit of separated Arko360 platform"],
    ["git", "branch", "-M", "main"],
    ["git", "remote", "add", "origin", "https://github.com/gynsys/arko360_platform.git"],
    ["git", "push", "-u", "origin", "main"]
]

for cmd in commands:
    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=repo_dir)

print("Done.")
