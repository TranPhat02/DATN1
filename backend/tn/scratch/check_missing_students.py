import sys
import os
from sqlalchemy import create_engine
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from tn.config.database import settings
from sqlalchemy import text

engine = create_engine(settings.MYSQL_URL)
with engine.connect() as conn:
    # Query all students in taikhoan
    accounts = conn.execute(text("SELECT UserName FROM taikhoan WHERE Role = 'student'")).all()
    print(f"Total student accounts in taikhoan: {len(accounts)}")
    
    missing = []
    for acc in accounts:
        username = acc[0]
        exists = conn.execute(text(f"SELECT COUNT(*) FROM SinhVien WHERE MaSV = '{username}'")).scalar() > 0
        if not exists:
            missing.append(username)
            
    print(f"Total missing student records in SinhVien table: {len(missing)}")
    print("Missing usernames:", missing)
