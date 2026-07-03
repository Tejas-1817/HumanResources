import urllib.request
import json

def test_full_reset_flow():
    # 1. Request forgot password
    forgot_url = "http://localhost:8000/api/v1/auth/forgot-password"
    forgot_data = json.dumps({"email": "ankita.mate@altzor.com"}).encode("utf-8")
    req_forgot = urllib.request.Request(forgot_url, data=forgot_data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req_forgot) as res:
            body = json.loads(res.read().decode("utf-8"))
            print("Forgot Password Response:", body)
            reset_link = body.get("reset_link")
            if not reset_link:
                print("Error: No reset link returned!")
                return
            token = reset_link.split("/")[-1]
            print(f"Extracted token: {token}")
    except Exception as e:
        print("Forgot password request failed:", e)
        return

    # 2. Reset password using the token
    reset_url = "http://localhost:8000/api/v1/auth/reset-password"
    reset_data = json.dumps({
        "token": token,
        "new_password": "NewAdminPassword123"
    }).encode("utf-8")
    req_reset = urllib.request.Request(reset_url, data=reset_data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req_reset) as res:
            body = json.loads(res.read().decode("utf-8"))
            print("Reset Password Response:", body)
            print("SUCCESS: Reset password endpoint returned 200 and completed successfully!")
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Reset password request failed ({e.code}): {e.read().decode()}")
        else:
            print("Reset password request failed:", e)

test_full_reset_flow()
