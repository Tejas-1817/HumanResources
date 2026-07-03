from app.database.session import SessionLocal
from app.services.application_service import ApplicationService
from app.models.job_role import JobRole

db = SessionLocal()

def test_filtering():
    print("--- TESTING ROLE FILTERING ---")
    
    # 1. Fetch for Java (41)
    java_apps = ApplicationService.get_all(db, job_role_id=41)
    print(f"Java Role (41) Apps: {[a.id for a in java_apps]}")
    for a in java_apps:
        print(f"  App {a.id} -> Role {a.job_role_id}")
        
    # 2. Fetch for Python (42)
    python_apps = ApplicationService.get_all(db, job_role_id=42)
    print(f"Python Role (42) Apps: {[a.id for a in python_apps]}")
    for a in python_apps:
        print(f"  App {a.id} -> Role {a.job_role_id}")
        
if __name__ == "__main__":
    test_filtering()
    db.close()
