import sqlalchemy
from tn.config.database import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE DiemTracNghiem ADD COLUMN ThoiGianLam INT NULL;"))
            print("Added ThoiGianLam column.")
        except Exception as e:
            print(f"ThoiGianLam column may already exist: {e}")

        try:
            conn.execute(text("ALTER TABLE DiemTracNghiem ADD COLUMN ThoiGianNop DATETIME NULL;"))
            print("Added ThoiGianNop column.")
        except Exception as e:
            print(f"ThoiGianNop column may already exist: {e}")

if __name__ == "__main__":
    run_migration()
