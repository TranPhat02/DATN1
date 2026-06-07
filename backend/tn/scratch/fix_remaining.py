"""Fix remaining tables with correct column names."""
import sys
sys.path.insert(0, "/app/src")
from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

def fix_text(val):
    if not val:
        return val
    try:
        fixed = val.encode('cp437').decode('utf-8')
        return fixed
    except (UnicodeEncodeError, UnicodeDecodeError):
        return val

# Correct table definitions: (table, pk_col, [text_columns])
tables = [
    ("KhoaHoc",    "MaKhoa",    ["TenKhoa"]),
    ("NamHoc",     "MaNamHoc",  ["NamHoc"]),
    ("HocKi",      "MaHocKi",   ["TenHocKi"]),
    ("LopMonHoc",  "MaLopMon",  ["TenLopMon"]),
    ("DiemMonHoc", "MaDiem",    ["GhiChu"]),
    ("LichHoc",    "MaLich",    ["PhongHoc"]),
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
            pk_val, original = row[0], row[1]
            if not original:
                continue
            fixed = fix_text(original)
            if fixed != original:
                db.execute(
                    text(f"UPDATE `{table}` SET `{col}` = :val WHERE `{pk_col}` = :pk"),
                    {"val": fixed, "pk": pk_val}
                )
                fixed_count += 1
        if fixed_count > 0:
            db.commit()
            print(f"[FIXED] {table}.{col}: {fixed_count} rows")
            total_fixed += fixed_count
        else:
            print(f"[OK]    {table}.{col}: no fix needed")

print(f"\n=== DONE: {total_fixed} total rows fixed ===")

# Quick verify
for t, _, cols in tables:
    for c in cols:
        try:
            rows = db.execute(text(f"SELECT `{c}` FROM `{t}` WHERE `{c}` IS NOT NULL LIMIT 2")).fetchall()
            if rows:
                print(f"{t}.{c}: {[r[0] for r in rows]}")
        except:
            pass

db.close()
