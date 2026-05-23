import pymysql
import sys

def main():
    try:
        # Connect to MySQL database `tn`
        conn = pymysql.connect(host="localhost", user="root", password="", db="tn")
        
        with conn.cursor() as cursor:
            # 1. Add HocGhep to SinhVien_LopMonHoc if not exists
            try:
                cursor.execute("ALTER TABLE SinhVien_LopMonHoc ADD COLUMN HocGhep TINYINT(1) NOT NULL DEFAULT 0;")
                print("✅ Thêm cột HocGhep vào SinhVien_LopMonHoc thành công.")
            except Exception as e:
                # 1060 is duplicate column name
                if e.args[0] == 1060:
                    print("⚠️ Cột HocGhep đã tồn tại trong SinhVien_LopMonHoc.")
                else:
                    print(f"Lỗi: {e}")
            
            # 2. Drop HocGhep from LopMonHoc if exists
            try:
                cursor.execute("ALTER TABLE LopMonHoc DROP COLUMN HocGhep;")
                print("✅ Xoá cột HocGhep khỏi LopMonHoc thành công.")
            except Exception as e:
                # 1091 is cant drop column
                if e.args[0] == 1091:
                    print("⚠️ Cột HocGhep không tồn tại trong LopMonHoc.")
                else:
                    print(f"Lỗi: {e}")
                    
        conn.commit()
        print("🎉 Database schema update complete!")
    except Exception as e:
        print(f"❌ Failed to connect or run updates: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals() and conn.open:
            conn.close()

if __name__ == "__main__":
    main()
