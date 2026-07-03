from app.database.session import get_db
from app.models.vendor import Vendor
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.job_application import JobApplication
from app.models.user import User
from app.models.company import Company
from app.models.activity_log import ActivityLog

db = next(get_db())
vendor = db.query(Vendor).filter(Vendor.email == "tejasvatane@gmail.com").first()
if vendor:
    print(f"Vendor found: {vendor.email}")
    print(f"Hashed Password: {vendor.hashed_password}")
else:
    print("Vendor not found")
