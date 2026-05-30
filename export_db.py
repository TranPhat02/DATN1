import os
import subprocess
import json
from datetime import datetime
from pymongo import MongoClient
from bson import json_util

def export_mysql(backup_dir):
    print("--- Exporting MySQL ---")
    mysqldump_path = r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"
    db_user = "admin"
    db_pass = "123456"
    db_port = "3308"
    db_name = "tn"
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mysql_filename = f"mysql_backup_{timestamp}.sql"
    mysql_filepath = os.path.join(backup_dir, mysql_filename)
    
    # We will invoke mysqldump
    # Under Windows, using --result-file ensures correct encoding (UTF-8) and avoids PowerShell redirection issues.
    cmd = [
        mysqldump_path,
        f"-u{db_user}",
        f"-p{db_pass}",
        "--port", db_port,
        "--host", "127.0.0.1",
        f"--result-file={mysql_filepath}",
        db_name
    ]
    
    try:
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"[SUCCESS] MySQL database '{db_name}' exported successfully to:")
        print(f"  -> {mysql_filepath}")
        return mysql_filepath
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Failed to run mysqldump: {e}")
        if e.stderr:
            print(f"Details: {e.stderr}")
        return None

def export_mongodb(backup_dir):
    print("\n--- Exporting MongoDB ---")
    mongo_uri = "mongodb+srv://phattran2662002_db_user:123@cluster0.getdpyg.mongodb.net/"
    db_name = "tn_db"
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Create a subfolder for MongoDB collections
    mongo_subfolder = os.path.join(backup_dir, f"mongodb_backup_{timestamp}")
    
    try:
        client = MongoClient(mongo_uri)
        db = client[db_name]
        
        # Get all collections
        collections = db.list_collection_names()
        print(f"Found {len(collections)} collections in MongoDB database '{db_name}': {collections}")
        
        if not os.path.exists(mongo_subfolder):
            os.makedirs(mongo_subfolder)
            print(f"Created subfolder for MongoDB collections: {mongo_subfolder}")
            
        exported_files = []
        for coll_name in collections:
            coll = db[coll_name]
            documents = list(coll.find({}))
            print(f"  - Exporting collection '{coll_name}': {len(documents)} documents")
            
            coll_filename = f"{coll_name}.json"
            coll_filepath = os.path.join(mongo_subfolder, coll_filename)
            
            # Write this collection to its own JSON file
            with open(coll_filepath, 'w', encoding='utf-8') as f:
                f.write(json_util.dumps(documents, indent=2))
            
            exported_files.append(coll_filepath)
            
        print(f"[SUCCESS] MongoDB database '{db_name}' exported successfully to subfolder:")
        print(f"  -> {mongo_subfolder}")
        return mongo_subfolder
    except Exception as e:
        print(f"[ERROR] Failed to export MongoDB: {e}")
        return None

def main():
    # Backups directory
    backup_dir = r"d:\DATN1\backups"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        print(f"Created backup directory: {backup_dir}")
        
    mysql_file = export_mysql(backup_dir)
    mongo_file = export_mongodb(backup_dir)
    
    print("\n=================================")
    print("BACKUP PROCESS COMPLETED!")
    print("=================================")
    if mysql_file:
        print(f"MySQL Backup: {mysql_file}")
    if mongo_file:
        print(f"MongoDB Backup: {mongo_file}")

if __name__ == "__main__":
    main()
