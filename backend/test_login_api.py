import sys
import os
import json
import urllib.request

def test_login():
    print("Attempting login...")
    url = "http://localhost:8000/api/v1/auth/login"
    data = json.dumps({"email": "ankita.mate@altzor.com", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Status: {res.status}")
            print(f"Body: {res.read().decode()}")
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Error ({e.code}): {e.read().decode()}")
        else:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
