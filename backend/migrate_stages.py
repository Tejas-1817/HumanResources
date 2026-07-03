import sys
import os

# Add the parent directory to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import text
from app.database.session import engine

def migrate():
    print("Starting migration: Adding pipeline_stages to job_roles...")
    try:
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text("SHOW COLUMNS FROM job_roles LIKE 'pipeline_stages'"))
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                print("Column 'pipeline_stages' does not exist. Adding it...")
                conn.execute(text("ALTER TABLE job_roles ADD COLUMN pipeline_stages JSON NULL"))
                conn.commit()
                print("Migration successful: Added 'pipeline_stages' column.")
            else:
                print("Column 'pipeline_stages' already exists. Skipping.")
                
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
