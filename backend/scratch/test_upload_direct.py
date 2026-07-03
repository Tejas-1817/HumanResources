import asyncio
from fastapi import UploadFile
from io import BytesIO
from app.api.v1.endpoints.upload import upload_resume
from app.models.candidate import Candidate
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.models.company import Company
from app.models.vendor import Vendor
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.database.session import get_db

async def run_test():
    db = next(get_db())
    admin_user = db.query(User).filter(User.role == "admin").first()
    if not admin_user:
        print("No admin user found")
        return
        
    print(f"Using admin user: {admin_user.email}")
    
    # Create mock upload file
    file_content = b"%PDF-1.4 mock resume content"
    f = BytesIO(file_content)
    upload_file = UploadFile(filename="mock_resume_direct.pdf", file=f)
    
    # Call upload_resume function directly
    res = await upload_resume(
        file=upload_file,
        job_role_id=None,
        job_role_title=None,
        company_id=3,
        source="direct",
        consultancy_name=None,
        db=db,
        current_user=admin_user
    )
    print("Upload direct result:", res)
    
    # Query Candidate 
    candidate = db.query(Candidate).filter(Candidate.id == res.candidate_id).first()
    print(f"Candidate: ID={candidate.id}, Name={candidate.name}, Email={candidate.email}")
    
    apps = db.query(JobApplication).filter(JobApplication.candidate_id == res.candidate_id).all()
    print(f"Applications: {len(apps)}")
    for app in apps:
        role = db.query(JobRole).filter(JobRole.id == app.job_role_id).first()
        company = db.query(Company).filter(Company.id == role.company_id).first()
        print(f"  App ID={app.id}, Role={role.title}, Company={company.name}")

if __name__ == "__main__":
    asyncio.run(run_test())
