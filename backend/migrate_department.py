"""
Migration: Add department to job_roles table
Run: python migrate_department.py
"""
from app.database.session import engine
from sqlalchemy import text

def column_exists(conn, table, column):
    result = conn.execute(text(f"SHOW COLUMNS FROM `{table}` LIKE :col"), {"col": column})
    return result.fetchone() is not None

with engine.connect() as conn:
    if not column_exists(conn, "job_roles", "department"):
        conn.execute(text("ALTER TABLE job_roles ADD COLUMN department VARCHAR(255) NULL"))
        print("[OK] Added column: department")
    else:
        print("[SKIP] department already exists")

    # Update default departments for existing roles
    updates = [
        ("Senior developer", "Engineering"),
        ("Python Developer", "Engineering"),
        ("DevOps Engineer", "Engineering"),
        ("Power Platfom Developer", "Engineering"),
        ("Tester", "QA"),
        ("Business Development", "Sales & Marketing"),
        ("Outreach Executuve", "Sales & Marketing"),
        ("Accountant", "Finance"),
        ("HR", "Human Resources"),
        ("General", "Operations"),
    ]

    for title, dept in updates:
        conn.execute(
            text("UPDATE job_roles SET department = :dept WHERE title = :title AND (department IS NULL OR department = '')"),
            {"dept": dept, "title": title}
        )
        print(f"[OK] Updated department to '{dept}' for roles with title '{title}'")

    # Fallback default for any remaining empty departments
    conn.execute(
        text("UPDATE job_roles SET department = 'Operations' WHERE department IS NULL OR department = ''")
    )
    print("[OK] Set fallback 'Operations' for remaining empty departments")

    conn.commit()

print("\nMigration complete!")
