import requests

def run_test():
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login
    login_payload = {
        "email": "ankita.mate@altzor.com",
        "password": "admin123"
    }
    r = requests.post(f"{base_url}/auth/login", json=login_payload)
    if r.status_code != 200:
        print("Login failed:", r.status_code, r.text)
        return
        
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully. Token obtained.")
    
    # 2. Upload dummy file with company_id=3
    files = {
        "file": ("test_resume.pdf", b"%PDF-1.4 dummy content", "application/pdf")
    }
    # Send company_id=3 and source=direct
    data = {
        "company_id": 3,
        "source": "direct"
    }
    
    r = requests.post(f"{base_url}/upload/resume", headers=headers, files=files, data=data)
    print("Upload response:", r.status_code, r.json())
    
    # 3. Verify in DB
    from app.models.candidate import Candidate
    from app.models.job_application import JobApplication
    from app.models.job_role import JobRole
    from app.models.company import Company
    from app.models.vendor import Vendor
    from app.models.user import User
    from app.models.activity_log import ActivityLog
    from app.database.session import get_db
    
    db = next(get_db())
    cid = r.json().get("candidate_id")
    if cid:
        candidate = db.query(Candidate).filter(Candidate.id == cid).first()
        print(f"Candidate created: ID={candidate.id}, Name={candidate.name}, Email={candidate.email}")
        
        apps = db.query(JobApplication).filter(JobApplication.candidate_id == cid).all()
        print(f"Number of applications for candidate {cid}: {len(apps)}")
        for app in apps:
            role = db.query(JobRole).filter(JobRole.id == app.job_role_id).first()
            company = db.query(Company).filter(Company.id == role.company_id).first()
            print(f"  Application ID={app.id}, Role={role.title}, Company={company.name}")
    else:
        print("No candidate_id returned in response")

if __name__ == "__main__":
    run_test()
