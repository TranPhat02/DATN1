import sys
import os
from sqlalchemy import create_engine, text

# Add src to path just in case we need it
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from tn.config.database import settings
    mysql_url = settings.MYSQL_URL
except Exception:
    mysql_url = "mysql+pymysql://admin:123456@localhost:3308/tn"

print(f"Connecting to database: {mysql_url}")
engine = create_engine(mysql_url)

def add_column_if_not_exists(conn, table_name, column_name, column_definition):
    result = conn.execute(text(
        f"SELECT COUNT(*) FROM information_schema.COLUMNS "
        f"WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{table_name}' AND COLUMN_NAME='{column_name}'"
    ))
    exists = result.scalar() > 0
    if not exists:
        print(f"Adding column {column_name} to table {table_name}...")
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))
        print(f"Successfully added column {column_name}.")
        return True
    else:
        print(f"Column {column_name} already exists in table {table_name}.")
        return False

with engine.begin() as conn:
    # Modify MaTN length to VARCHAR(50)
    print("Modifying MaTN column length to VARCHAR(50)...")
    conn.execute(text("ALTER TABLE DiemTracNghiem MODIFY COLUMN MaTN VARCHAR(50) NOT NULL;"))
    print("Successfully modified MaTN column length.")

    # Adding SoLanViPham
    add_column_if_not_exists(conn, "DiemTracNghiem", "SoLanViPham", "INT NULL DEFAULT 0")
    
    # Adding ThoiGianLam
    add_column_if_not_exists(conn, "DiemTracNghiem", "ThoiGianLam", "INT NULL")
    
    # Adding ThoiGianNop
    add_column_if_not_exists(conn, "DiemTracNghiem", "ThoiGianNop", "DATETIME NULL")

print("Migration completed successfully!")
