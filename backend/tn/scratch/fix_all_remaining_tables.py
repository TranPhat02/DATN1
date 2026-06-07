"""Fix all remaining double-encoded (mojibake) columns found in GiaoVien, SinhVien, DiemTracNghiem."""
import sys
sys.path.insert(0, "/app/src")
from tn.config.database import SessionLocal
from sqlalchemy import text, inspect

db = SessionLocal()
inspector = inspect(db.bind)

def fix_text(val):
    if not val:
        return val
    try:
        fixed = val.encode('cp437').decode('utf-8')
        return fixed
    except (UnicodeEncodeError, UnicodeDecodeError):
        return val

# Explicit columns to fix
tables_to_fix = {
    "DiemTracNghiem": ("MaTN", ["FileID"]),
    "GiaoVien": ("MaGV", ["DiaChi", "GioiTinh"]),
    "SinhVien": ("MaSV", ["DiaChi", "GioiTinh"])
}

print("=== FIXING ALL REMAINING ENCODING ISSUES ===")
total_fixed = 0

for table_name, (pk_col, cols) in tables_to_fix.items():
    for col in cols:
        try:
            # Query data
            rows = db.execute(text(f"SELECT `{pk_col}`, `{col}` FROM `{table_name}`")).fetchall()
        except Exception as e:
            print(f"[ERROR] Failed to query {table_name}.{col}: {e}")
            continue
            
        fixed_count = 0
        for r in rows:
            pk_val = r[0]
            val = r[1]
            if not val or not isinstance(val, str):
                continue
                
            fixed = fix_text(val)
            if fixed != val:
                try:
                    db.execute(
                        text(f"UPDATE `{table_name}` SET `{col}` = :val WHERE `{pk_col}` = :pk"),
                        {"val": fixed, "pk": pk_val}
                    )
                    fixed_count += 1
                except Exception as e:
                    print(f"  [ERROR] UPDATE {table_name}.{col} for {pk_val}: {e}")
                    
        if fixed_count > 0:
            db.commit()
            print(f"[FIXED] {table_name}.{col}: {fixed_count} rows")
            total_fixed += fixed_count
        else:
            print(f"[OK]    {table_name}.{col}: no fix needed")

print(f"\n=== FINISHED: {total_fixed} total rows fixed ===")

# Verify
print("\n=== VERIFICATION ===")
for table_name, (pk_col, cols) in tables_to_fix.items():
    for col in cols:
        try:
            rows = db.execute(text(f"SELECT DISTINCT `{col}` FROM `{table_name}` WHERE `{col}` IS NOT NULL LIMIT 5")).fetchall()
            print(f"{table_name}.{col}: {[r[0] for r in rows]}")
        except Exception as e:
            print(f"{table_name}.{col} error: {e}")

db.close()
