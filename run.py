import os
import sys
import subprocess

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")

os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

# If running with global python and venv python exists, re-exec with venv python
if os.path.exists(venv_python) and sys.executable.lower() != venv_python.lower():
    sys.exit(subprocess.call([venv_python, os.path.join(backend_dir, "run.py")] + sys.argv[1:]))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
