from app.database.session import SessionLocal
from app.services.auth_service import AuthService
from app.models.vendor import Vendor, VendorJobAssignment
from app.models.candidate import Candidate
from app.models.user import User
from app.models.job_role import JobRole
from app.models.job_application import JobApplication
from app.models.company import Company
from app.models.activity_log import ActivityLog

def test_universal_login():
    with SessionLocal() as db:
        # Test vendor account
        email = "tejasvatane@gmail.com"
        password = "password123"
        
        print(f"Testing Universal Login for Vendor: {email}")
        try:
            result = AuthService.login(db, email, password)
            print("Login SUCCESS!")
            print(f"Role returned: {result.get('role')}")
            print(f"Vendor Info: {result.get('vendor').name if result.get('vendor') else 'None'}")
            print(f"Auth token exists: {'Yes' if result.get('access_token') else 'No'}")
        except Exception as e:
            print(f"Login FAILED: {str(e)}")

if __name__ == "__main__":
    test_universal_login()
