from app.database.session import get_db
from app.models.vendor import Vendor
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.job_application import JobApplication
from app.models.user import User
from app.models.company import Company
from app.models.activity_log import ActivityLog
from app.core.security import hash_password

db = next(get_db())
vendor = db.query(Vendor).filter(Vendor.email == "atharvapatekar0611@gmail.com").first()
if vendor:
    vendor.hashed_password = hash_password("Admin@123")
    db.commit()
    print("Password updated for atharvapatekar0611@gmail.com to Admin@123")
else:
    print("Vendor not found")
