import requests
import json

base_url = "http://localhost:8000/api/v1"

# Try to update a pipeline status
def test_update():
    # We need a valid application ID. I'll try to get one from the pipeline.
    # But wait, I don't have a token.
    # This might be hard.
    pass

if __name__ == "__main__":
    print("Testing backend connectivity...")
    try:
        r = requests.get(f"{base_url}/pipeline")
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")
