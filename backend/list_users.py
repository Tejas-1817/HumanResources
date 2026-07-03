from app.database.session import get_db
from app.models.vendor import Vendor
from app.models.user import User
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.job_application import JobApplication
from app.models.company import Company
from app.models.activity_log import ActivityLog

db = next(get_db())
vendors = db.query(Vendor).all()
users = db.query(User).all()

print("VENDORS:")
for v in vendors:
    print(f"ID: {v.id}, Email: {v.email}, Name: {v.name}, Active: {v.is_active}")

print("\nUSERS (HR):")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Name: {u.name}, Role: {u.role}, Active: {u.is_active}")
