"""Test the API endpoint from python directly to check its response encoding."""
import requests

# Login
login_res = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    data={"username": "admin", "password": "admin123"}
)
token = login_res.json()["access_token"]

# Get lich-hoc
headers = {"Authorization": f"Bearer {token}"}
res = requests.get("http://localhost:8000/api/v1/lich-hoc/", headers=headers)
data = res.json()

print(f"Status Code: {res.status_code}")
print(f"Content-Type Header: {res.headers.get('content-type')}")
print("=== FIRST RECORD ===")
first = data[0]
for k, v in first.items():
    if isinstance(v, str):
        print(f"  {k}: '{v}' | hex={v.encode('utf-8').hex()}")
    else:
        print(f"  {k}: {v}")
