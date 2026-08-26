"""
Migration: Modify experience_required column in job_roles to VARCHAR(100) to support ranges (e.g. "3-5 years")
Run: python migrate_experience_string.py
"""
from app.database.session import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        print("Migrating job_roles.experience_required to VARCHAR(100)...")
        conn.execute(text("ALTER TABLE job_roles MODIFY COLUMN experience_required VARCHAR(100) NULL;"))
        conn.commit()
        print("[OK] Successfully modified job_roles.experience_required to VARCHAR(100)")

    print("\nMigration complete!")

if __name__ == "__main__":
    run_migration()
