import sys
import os
from sqlalchemy import create_engine
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from tn.config.database import settings
from sqlalchemy import text

engine = create_engine(settings.MYSQL_URL)
with engine.connect() as conn:
    res = conn.execute(text("SELECT MaSV, TenSV, GioiTinh, DiaChi, MaLop, MaKhoa, Gmail FROM SinhVien LIMIT 1"))
    row = res.first()
    print("Example SinhVien row:")
    print("MaSV:", row[0])
    print("TenSV:", row[1].encode('utf-8'))
    print("GioiTinh:", row[2].encode('utf-8') if row[2] else None)
    print("DiaChi:", row[3].encode('utf-8') if row[3] else None)
    print("MaLop:", row[4])
    print("MaKhoa:", row[5])
    print("Gmail:", row[6])
