from app.core.security import verify_password

hashed = "$2b$12$5KcI1PBXjUT2YyJtAowx5O.ebKLDq6a4ATByHaJBEZTpJEtoLXeQe"
plain = "Admin@123"

if verify_password(plain, hashed):
    print("MATCH! Password is indeed Admin@123")
else:
    print("NO MATCH! Password is NOT Admin@123")
