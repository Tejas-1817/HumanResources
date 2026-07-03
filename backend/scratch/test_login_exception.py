import traceback
from app.database.session import SessionLocal
from app.services.auth_service import AuthService

db = SessionLocal()
try:
    print("Attempting to run AuthService.login...")
    result = AuthService.login(db, "ankita.mate@altzor.com", "admin123")
    print("Success:", result)
except Exception as e:
    print("Error during login:")
    traceback.print_exc()
finally:
    db.close()
