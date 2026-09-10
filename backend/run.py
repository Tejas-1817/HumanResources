import os
import sys
import subprocess

backend_dir = os.path.dirname(os.path.abspath(__file__))
venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")

# If running with global python and venv python exists, re-exec with venv python
if os.path.exists(venv_python) and sys.executable.lower() != venv_python.lower():
    sys.exit(subprocess.call([venv_python] + sys.argv))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
