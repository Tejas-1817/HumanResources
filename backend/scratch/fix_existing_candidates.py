from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.interview_schedule import InterviewSchedule
from app.models.interviewer import Interviewer
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.models.user import User
from app.models.vendor import Vendor
from app.database.session import get_db

def fix_candidates():
    db = next(get_db())
    
    # 1. Find or create the General role for Altzor Digital Solutions (Company 3)
    company_id = 3
    admin_user = db.query(User).filter(User.role == "admin").first()
    if not admin_user:
        print("No admin user found")
        return
        
    general_role = db.query(JobRole).filter(
        JobRole.company_id == company_id,
        JobRole.title == "General"
    ).first()
    
    if not general_role:
        general_role = JobRole(
            company_id=company_id,
            title="General",
            description="General positions and unassigned talent pool.",
            status="open",
            created_by=admin_user.id,
        )
        db.add(general_role)
        db.flush()
        print(f"Created General role for company 3. Role ID = {general_role.id}")
    else:
        print(f"Found existing General role. Role ID = {general_role.id}")
        
    # 2. Find recent candidates with no applications
    unassigned_candidates = db.query(Candidate).filter(~Candidate.applications.any()).all()
    print(f"Found {len(unassigned_candidates)} unassigned candidates.")
    
    for c in unassigned_candidates:
        print(f"Linking candidate {c.id} ({c.name}) to General role...")
        app = JobApplication(
            candidate_id=c.id,
            job_role_id=general_role.id,
            submitted_by=admin_user.id,
            source="direct",
            status="pending",
            resume_sent=False,
        )
        db.add(app)
        
    db.commit()
    print("Candidates fixed successfully.")

if __name__ == "__main__":
    fix_candidates()
