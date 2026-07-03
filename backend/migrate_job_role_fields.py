"""
Migration: Add location, work_mode, experience_required to job_roles table
Run: python migrate_job_role_fields.py
"""
from app.database.session import engine
from sqlalchemy import text

def column_exists(conn, table, column):
    result = conn.execute(text(f"SHOW COLUMNS FROM `{table}` LIKE :col"), {"col": column})
    return result.fetchone() is not None

with engine.connect() as conn:
    if not column_exists(conn, "job_roles", "location"):
        conn.execute(text("ALTER TABLE job_roles ADD COLUMN location VARCHAR(255) NULL"))
        print("[OK] Added column: location")
    else:
        print("[SKIP] location already exists")

    if not column_exists(conn, "job_roles", "work_mode"):
        conn.execute(text("ALTER TABLE job_roles ADD COLUMN work_mode VARCHAR(50) NULL"))
        print("[OK] Added column: work_mode")
    else:
        print("[SKIP] work_mode already exists")

    if not column_exists(conn, "job_roles", "experience_required"):
        conn.execute(text("ALTER TABLE job_roles ADD COLUMN experience_required FLOAT NULL"))
        print("[OK] Added column: experience_required")
    else:
        print("[SKIP] experience_required already exists")

    conn.commit()

print("\nMigration complete!")
