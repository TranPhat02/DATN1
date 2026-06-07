"""
Fix ALL mojibake data in MySQL.
Pattern: UTF-8 bytes were read as CP437 then re-encoded as UTF-8.
Fix: encode back to CP437 → decode as UTF-8.
"""
import sys
sys.path.insert(0, "/app/src")

from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

def fix_text(val):
    """Reverse the CP437 mojibake."""
    if not val:
        return val
    try:
        fixed = val.encode('cp437').decode('utf-8')
        return fixed
    except (UnicodeEncodeError, UnicodeDecodeError):
        return val  # not affected, leave as-is


# Define all tables and their text columns + primary key
# Format: (table, pk_col, [text_columns])
tables = [
    ("Lop",       "MaLop",    ["TenLop"]),
    ("SinhVien",  "MaSV",     ["TenSV"]),
    ("GiaoVien",  "MaGV",     ["TenGV"]),
    ("MonHoc",    "MaMH",     ["TenMH"]),
    ("KhoaHoc",   "MaKhoaHoc",["TenKhoa"]),
    ("NamHoc",    "MaNamHoc", ["TenNamHoc"]),
    ("TaiKhoan",  "UserName", ["HoTen"]),
]

total_fixed = 0

for table, pk_col, text_cols in tables:
    for col in text_cols:
        try:
            rows = db.execute(text(f"SELECT `{pk_col}`, `{col}` FROM `{table}`")).fetchall()
        except Exception as e:
            print(f"[SKIP] {table}.{col}: {e}")
            continue

        fixed_count = 0
        for row in rows:
            pk_val = row[0]
            original = row[1]
            if not original:
                continue
            fixed = fix_text(original)
            if fixed != original:
                try:
                    db.execute(
                        text(f"UPDATE `{table}` SET `{col}` = :val WHERE `{pk_col}` = :pk"),
                        {"val": fixed, "pk": pk_val}
                    )
                    fixed_count += 1
                except Exception as e:
                    print(f"  [ERROR] {table}.{pk_col}={pk_val}: {e}")

        if fixed_count > 0:
            db.commit()
            print(f"[FIXED] {table}.{col}: {fixed_count} rows")
            total_fixed += fixed_count
        else:
            print(f"[OK]    {table}.{col}: no fix needed")

print(f"\n=== DONE: {total_fixed} total rows fixed ===")

# Verify
print("\n=== VERIFICATION ===")
verify = [
    ("Lop", "TenLop", 3),
    ("SinhVien", "TenSV", 3),
    ("GiaoVien", "TenGV", 3),
    ("MonHoc", "TenMH", 3),
]
for table, col, limit in verify:
    try:
        rows = db.execute(text(f"SELECT `{col}` FROM `{table}` LIMIT {limit}")).fetchall()
        print(f"{table}.{col}:")
        for r in rows:
            print(f"  {r[0]}")
    except Exception as e:
        print(f"{table}.{col}: {e}")

db.close()
