import json
import urllib.request

url = "https://pypi.org/pypi/SQLAlchemy/json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        data = json.loads(content)
        latest_version = data.get("info", {}).get("version")
        print(f"Latest SQLAlchemy version: {latest_version}")
except Exception as e:
    print(f"Error: {e}")
