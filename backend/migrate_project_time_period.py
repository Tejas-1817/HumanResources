"""
Migration: Add project_time_period to job_roles table
Run: python migrate_project_time_period.py
"""
from app.database.session import engine
from sqlalchemy import text

def column_exists(conn, table, column):
    # For MySQL
    result = conn.execute(text(f"SHOW COLUMNS FROM `{table}` LIKE :col"), {"col": column})
    return result.fetchone() is not None

with engine.connect() as conn:
    if not column_exists(conn, "job_roles", "project_time_period"):
        conn.execute(text("ALTER TABLE job_roles ADD COLUMN project_time_period VARCHAR(100) NULL"))
        print("[OK] Added column: project_time_period")
    else:
        print("[SKIP] project_time_period already exists")

    conn.commit()

print("\nMigration complete!")
