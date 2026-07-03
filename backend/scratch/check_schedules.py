from app.database.session import get_db
from app.models.interview_schedule import InterviewSchedule
from app.models.job_role import JobRole
from app.models.candidate import Candidate
from app.models.interviewer import Interviewer
from app.models.company import Company
from app.models.user import User
from app.models.vendor import Vendor
from app.models.job_application import JobApplication
from app.models.activity_log import ActivityLog

def check_schedules():
    db = next(get_db())
    schedules = db.query(InterviewSchedule).all()
    print(f"Total Interview Schedules: {len(schedules)}")
    for s in schedules:
        print(f"ID: {s.id} | Job Role: {s.job_role_title} (ID: {s.job_role_id}) | "
              f"Interviewer: {s.interviewer_name} (ID: {s.interviewer_id}) | "
              f"Date: {s.date} | Time: {s.time} | Venue: {s.venue} | "
              f"Candidate: {s.candidate_name} (ID: {s.candidate_id})")

if __name__ == "__main__":
    check_schedules()
