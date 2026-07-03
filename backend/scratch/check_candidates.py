from sqlalchemy import text
from app.database.session import get_db

def check_candidates():
    db = next(get_db())
    
    print("--- COMPANIES ---")
    comps = db.execute(text("SELECT id, name FROM companies")).fetchall()
    for comp in comps:
        print(f"Company ID: {comp[0]} | Name: {comp[1]}")

    print("\n--- JOB ROLES ---")
    roles = db.execute(text("SELECT id, company_id, title, status FROM job_roles")).fetchall()
    for role in roles:
        print(f"Role ID: {role[0]} | Company ID: {role[1]} | Title: {role[2]} | Status: {role[3]}")

    print("\n--- RECENT CANDIDATES ---")
    candidates = db.execute(text("SELECT id, name, email, created_at FROM candidates ORDER BY id DESC LIMIT 5")).fetchall()
    for c in candidates:
        print(f"ID: {c[0]} | Name: {c[1]} | Email: {c[2]} | Created At: {c[3]}")
        print("  Applications:")
        apps = db.execute(text("SELECT ja.id, ja.status, jr.title, comp.name FROM job_applications ja LEFT JOIN job_roles jr ON ja.job_role_id = jr.id LEFT JOIN companies comp ON jr.company_id = comp.id WHERE ja.candidate_id = :cid"), {"cid": c[0]}).fetchall()
        for app in apps:
            print(f"    App ID: {app[0]} | Status: {app[1]} | Role: {app[2]} | Company: {app[3]}")

if __name__ == "__main__":
    check_candidates()
