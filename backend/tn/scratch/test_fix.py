"""
Fix mojibake: UTF-8 bytes were read as CP437, then re-encoded as UTF-8.
Reverse: encode corrupted text back to CP437, then decode as UTF-8.
"""
import sys
sys.path.insert(0, "/app/src")

from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Test the fix logic first
test_rows = db.execute(text("SELECT MaLop, TenLop FROM Lop LIMIT 5")).fetchall()
print("=== BEFORE / AFTER FIX ===")
for row in test_rows:
    original = row[1]
    try:
        fixed = original.encode('cp437').decode('utf-8')
        print(f"  {row[0]}: '{original}' -> '{fixed}'")
    except Exception as e:
        print(f"  {row[0]}: '{original}' -> ERROR: {e}")

print()

# Check other tables
tables_cols = [
    ("KhoaHoc", "TenKhoaHoc"),
    ("SinhVien", "TenSV"),
    ("GiaoVien", "TenGV"),
    ("MonHoc", "TenMH"),
    ("LopMonHoc", "TenLopMon"),
    ("HocKi", "TenHK"),
]

for table, col in tables_cols:
    try:
        rows = db.execute(text(f"SELECT {col} FROM {table} LIMIT 3")).fetchall()
        if rows:
            print(f"=== {table}.{col} ===")
            for r in rows:
                val = r[0] if r[0] else "(NULL)"
                try:
                    fixed = val.encode('cp437').decode('utf-8') if val != "(NULL)" else val
                    needs_fix = (fixed != val)
                    print(f"  '{val}' -> '{fixed}' {'[NEEDS FIX]' if needs_fix else '[OK]'}")
                except Exception as e:
                    print(f"  '{val}' -> ERROR: {e}")
    except Exception as e:
        print(f"=== {table}.{col} === ERROR: {e}")

db.close()
