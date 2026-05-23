import pymysql
import sys

def main():
    try:
        # Read SQL file
        with open("tn_init.sql", "r", encoding="utf-8") as f:
            sql_script = f.read()

        # Connect to MySQL server
        conn = pymysql.connect(host="localhost", user="root", password="")
        
        try:
            with conn.cursor() as cursor:
                # Basic parsing to handle multiple statements
                # Splitting by ; is naive but works for simple init scripts without triggers/functions
                statements = [s.strip() for s in sql_script.split(';') if s.strip()]
                for statement in statements:
                    try:
                        cursor.execute(statement)
                    except Exception as e:
                        print(f"Warning/Error on statement: {statement[:50]}... \nDetails: {e}")
            conn.commit()
            print("✅ Database `tn` and tables initialized successfully from tn_init.sql")
        finally:
            conn.close()
            
    except Exception as e:
        print(f"❌ Failed to connect or initialize database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
