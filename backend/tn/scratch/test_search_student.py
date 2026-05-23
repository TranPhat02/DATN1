import sys
import os
from sqlalchemy import create_engine
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from tn.config.database import settings
from sqlalchemy import text

engine = create_engine(settings.MYSQL_URL)
with engine.connect() as conn:
    print("Searching for accounts in taikhoan:")
    res = conn.execute(text("SELECT UserName, Role FROM taikhoan WHERE UserName LIKE 'SV260401154%' OR UserName LIKE 'SV260414164%'"))
    for row in res:
        print(f"UserName: {row[0]}, Role: {row[1]}")
