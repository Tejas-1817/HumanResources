import json
import urllib.request
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.interview_schedule import InterviewSchedule
from app.models.company import Company
from app.models.job_role import JobRole
from app.models.interviewer import Interviewer
from app.models.user import User
from app.models.vendor import Vendor
from app.models.job_application import JobApplication
from app.models.activity_log import ActivityLog

def run_request(url, method, payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode())
    except Exception as e:
        if hasattr(e, 'read'):
            return e.code, e.read().decode()
        raise e

def run_test():
    # 1. Login to get token
    url = "http://localhost:8000/api/v1/auth/login"
    payload = {"email": "ankita.mate@altzor.com", "password": "admin123"}
    status, body = run_request(url, "POST", payload)
    token = body["access_token"]

    # 2. Get some candidates from DB
    db = next(get_db())
    candidates = db.query(Candidate).limit(2).all()
    c_ids = [c.id for c in candidates]
    print(f"Candidates found in DB: {[(c.id, c.name) for c in candidates]}")

    if len(c_ids) == 0:
        print("No candidates found in DB to test assignment.")
        return

    # 3. Assign candidates to schedule ID 2
    print(f"Assigning candidates {c_ids} to schedule ID 2...")
    assign_url = f"http://localhost:8000/api/v1/interview-schedules/2/assign"
    status, body = run_request(assign_url, "PUT", {"candidate_ids": c_ids}, token)
    print(f"Status code: {status}")
    print(f"Response body: {body}")

    # 4. Check DB again
    db.expire_all()
    schedules = db.query(InterviewSchedule).filter(InterviewSchedule.job_role_id == 1).all()
    print("\nAfter Assignment (database query):")
    for s in schedules:
        print(f"ID: {s.id} | Job Role: {s.job_role_title} | Candidate: {s.candidate_name} (ID: {s.candidate_id})")

    # 5. Remove one candidate to verify unassign
    if len(c_ids) > 1:
        print(f"\nRemoving candidate {c_ids[0]} from assignment...")
        status, body = run_request(assign_url, "PUT", {"candidate_ids": [c_ids[1]]}, token)
        print(f"Status code: {status}")
        db.expire_all()
        schedules = db.query(InterviewSchedule).filter(InterviewSchedule.job_role_id == 1).all()
        print("\nAfter Unassigning (database query):")
        for s in schedules:
            print(f"ID: {s.id} | Job Role: {s.job_role_title} | Candidate: {s.candidate_name} (ID: {s.candidate_id})")

if __name__ == "__main__":
    run_test()

if __name__ == "__main__":
    run_test()
