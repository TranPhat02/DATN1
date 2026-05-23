import pymysql
import sys

def main():
    try:
        conn = pymysql.connect(host="localhost", user="admin", password="123456", db="tn", port=3308)
        
        with conn.cursor() as cursor:
            # 1. Create KhoaHoc table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS KhoaHoc (
                MaKhoa VARCHAR(20) PRIMARY KEY,
                TenKhoa VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """)
            print("Created table KhoaHoc")
            
            # 2. Alter SinhVien
            try:
                cursor.execute("ALTER TABLE SinhVien ADD COLUMN MaKhoa VARCHAR(20);")
                print("Added MaKhoa to SinhVien")
            except Exception as e:
                print(f"SinhVien add column MaKhoa: {e}")
                
            try:
                cursor.execute("ALTER TABLE SinhVien ADD CONSTRAINT fk_sv_khoa FOREIGN KEY (MaKhoa) REFERENCES KhoaHoc(MaKhoa);")
                print("Added FK constraint to SinhVien")
            except Exception as e:
                print(f"SinhVien add FK: {e}")
                
            # 3. Alter Lop
            try:
                cursor.execute("ALTER TABLE Lop ADD COLUMN MaKhoa VARCHAR(20);")
                print("Added MaKhoa to Lop")
            except Exception as e:
                print(f"Lop add column MaKhoa: {e}")
                
            try:
                cursor.execute("ALTER TABLE Lop ADD CONSTRAINT fk_lop_khoa FOREIGN KEY (MaKhoa) REFERENCES KhoaHoc(MaKhoa);")
                print("Added FK constraint to Lop")
            except Exception as e:
                print(f"Lop add FK: {e}")
                
        conn.commit()
        print("Update complete")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals() and conn.open:
            conn.close()

if __name__ == "__main__":
    main()
