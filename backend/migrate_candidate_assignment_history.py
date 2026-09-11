import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import inspect, text
from app.database.session import engine

def migrate():
    inspector = inspect(engine)
    existing_columns = {col["name"] for col in inspector.get_columns("job_applications")}
    print("Current columns in job_applications:", existing_columns)

    columns_to_add = [
        ("start_date", "DATE NULL"),
        ("end_date", "DATE NULL"),
        ("completion_date", "DATETIME NULL"),
        ("drop_date", "DATETIME NULL"),
        ("drop_reason", "TEXT NULL"),
        ("joining_date", "DATE NULL"),
    ]

    with engine.begin() as conn:
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                print(f"Adding column {col_name} ({col_type}) to job_applications...")
                conn.execute(text(f"ALTER TABLE job_applications ADD COLUMN {col_name} {col_type}"))
                print(f"Column {col_name} added successfully.")
            else:
                print(f"Column {col_name} already exists.")

    # Re-inspect to confirm
    inspector = inspect(engine)
    new_columns = {col["name"] for col in inspector.get_columns("job_applications")}
    print("\nUpdated columns in job_applications:", new_columns)
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    migrate()
