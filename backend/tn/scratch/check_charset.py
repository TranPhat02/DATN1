from tn.config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
rows = db.execute(text("SHOW VARIABLES LIKE 'character_set%'")).fetchall()
for r in rows:
    print(f"{r[0]}: {r[1]}")
print("---")
rows2 = db.execute(text("SHOW VARIABLES LIKE 'collation%'")).fetchall()
for r in rows2:
    print(f"{r[0]}: {r[1]}")
print("---")
# Check actual data
rows3 = db.execute(text("SELECT MaLop, TenLop, HEX(TenLop) FROM Lop LIMIT 3")).fetchall()
for r in rows3:
    print(f"{r[0]}: {r[1]} | HEX: {r[2]}")
db.close()
