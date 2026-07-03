import requests

login_url = "http://127.0.0.1:8001/api/v1/auth/login"
payload = {
    "email": "ankita.mate@altzor.com",
    "password": "admin123"
}

print("Logging in...")
login_resp = requests.post(login_url, json=payload)
print("Login status:", login_resp.status_code)
if login_resp.status_code != 200:
    print(login_resp.text)
    exit(1)

token = login_resp.json()["access_token"]
print("Access token retrieved.")

notif_url = "http://127.0.0.1:8001/api/v1/notifications"
headers = {
    "Authorization": f"Bearer {token}"
}

print("\nFetching notifications...")
notif_resp = requests.get(notif_url, headers=headers)
print("Notifications status code:", notif_resp.status_code)
try:
    print(notif_resp.json())
except Exception:
    print(notif_resp.text)
