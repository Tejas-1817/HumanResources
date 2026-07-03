import sys
from pathlib import Path

# Add backend directory to sys.path so we can import app modules
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.session import engine
from sqlalchemy import text

def main():
    print("Dropping interview_schedules and interviewers tables...")
    with engine.connect() as conn:
        # Disable foreign key checks for MySQL during dropping if needed
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("DROP TABLE IF EXISTS interview_schedules;"))
        conn.execute(text("DROP TABLE IF EXISTS interviewers;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
    print("Tables dropped successfully.")

if __name__ == "__main__":
    main()
