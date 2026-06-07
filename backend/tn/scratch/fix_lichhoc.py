"""Check and fix LichHoc.Thu column encoding."""
import sys
sys.path.insert(0, "/app/src")
from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Check current data
rows = db.execute(text("SELECT MaLich, Thu, PhongHoc, Ca FROM LichHoc LIMIT 12")).fetchall()
print("=== CURRENT DATA ===")
for r in rows:
    thu_val = r[1] if r[1] else "(NULL)"
    print(f"  MaLich={r[0]} | Thu='{thu_val}' | HEX={thu_val.encode('utf-8').hex() if r[1] else 'NULL'} | Phong={r[2]} | Ca={r[3]}")

# Try fix
def fix_text(val):
    if not val:
        return val
    try:
        fixed = val.encode('cp437').decode('utf-8')
        return fixed
    except (UnicodeEncodeError, UnicodeDecodeError):
        return val

print("\n=== AFTER FIX ===")
fixed_count = 0
for r in rows:
    if not r[1]:
        continue
    fixed = fix_text(r[1])
    if fixed != r[1]:
        print(f"  MaLich={r[0]}: '{r[1]}' -> '{fixed}'")
        db.execute(text("UPDATE LichHoc SET Thu = :val WHERE MaLich = :pk"), {"val": fixed, "pk": r[0]})
        fixed_count += 1
    else:
        print(f"  MaLich={r[0]}: '{r[1]}' [OK]")

if fixed_count > 0:
    db.commit()
    print(f"\n[FIXED] {fixed_count} rows")

# Also fix ALL rows (not just first 12)
remaining = db.execute(text("SELECT MaLich, Thu FROM LichHoc")).fetchall()
extra_fixed = 0
for r in remaining:
    if not r[1]:
        continue
    fixed = fix_text(r[1])
    if fixed != r[1]:
        db.execute(text("UPDATE LichHoc SET Thu = :val WHERE MaLich = :pk"), {"val": fixed, "pk": r[0]})
        extra_fixed += 1
if extra_fixed > 0:
    db.commit()
    print(f"[FIXED] {extra_fixed} more rows from remaining data")

# Verify
print("\n=== VERIFICATION ===")
rows2 = db.execute(text("SELECT DISTINCT Thu FROM LichHoc")).fetchall()
for r in rows2:
    print(f"  Thu: '{r[0]}'")

db.close()
