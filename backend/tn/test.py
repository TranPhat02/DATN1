import urllib.request
import json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/auth/login', 
    data=b'username=admin&password=admin123', 
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)
res = json.loads(urllib.request.urlopen(req).read())
token = res['access_token']

# Create 
req2 = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/lop/', 
    data=b'{"MaLop": "L01", "TenLop": "Class 1"}', 
    headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
)
try:
    print("CREATE 1:")
    print(urllib.request.urlopen(req2).read().decode())
except Exception as e:
    print('Error CREATE 1:', e)
    if hasattr(e, 'read'): print(e.read().decode())

# Create Duplicate
req3 = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/lop/', 
    data=b'{"MaLop": "L01", "TenLop": "Class 1"}', 
    headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
)
try:
    print("CREATE 2 (Duplicate):")
    print(urllib.request.urlopen(req3).read().decode())
except Exception as e:
    print('Error CREATE 2:', e)
    if hasattr(e, 'read'): print(e.read().decode())
