"""Fix remaining tables with correct column names."""
import sys
sys.path.insert(0, "/app/src")
from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Discover actual columns
tables_to_check = ["KhoaHoc", "NamHoc", "TaiKhoan", "HocKi", "LopMonHoc", "DiemMonHoc", "LichHoc"]
for t in tables_to_check:
    try:
        cols = db.execute(text(f"SHOW COLUMNS FROM `{t}`")).fetchall()
        print(f"{t}: {[c[0] for c in cols]}")
    except Exception as e:
        print(f"{t}: ERROR {e}")

db.close()
