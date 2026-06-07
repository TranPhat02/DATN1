"""Check all MonHoc rows to see if any are still corrupted."""
import sys
sys.path.insert(0, "/app/src")
from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
rows = db.execute(text("SELECT MaMH, TenMH FROM MonHoc")).fetchall()
print("=== MonHoc ===")
for r in rows:
    val = r[1]
    if val:
        print(f"  {r[0]}: val='{val}' | hex={val.encode('utf-8').hex()}")
    else:
        print(f"  {r[0]}: None")

print("\n=== Lop ===")
rows = db.execute(text("SELECT MaLop, TenLop FROM Lop")).fetchall()
for r in rows:
    val = r[1]
    if val:
        print(f"  {r[0]}: val='{val}' | hex={val.encode('utf-8').hex()}")
    else:
        print(f"  {r[0]}: None")

db.close()
