"""Audit all text columns in all MySQL tables for double-encoding (mojibake) issues."""
import sys
sys.path.insert(0, "/app/src")
from tn.config.database import SessionLocal
from sqlalchemy import text, inspect

db = SessionLocal()
inspector = inspect(db.bind)

def fix_text(val):
    if not val:
        return val
    try:
        # If it can be encoded as CP437 and decoded as UTF-8 to a different string,
        # it was double-encoded mojibake.
        fixed = val.encode('cp437').decode('utf-8')
        return fixed
    except (UnicodeEncodeError, UnicodeDecodeError):
        return val

print("=== STARTING FULL DATABASE ENCODING AUDIT ===")
found_issues = {}

for table_name in inspector.get_table_names():
    columns = inspector.get_columns(table_name)
    text_columns = []
    
    # Identify string columns
    for col in columns:
        col_type = str(col['type']).lower()
        if 'varchar' in col_type or 'text' in col_type or 'char' in col_type:
            text_columns.append(col['name'])
            
    if not text_columns:
        continue
        
    # Query primary key(s)
    pk_cols = inspector.get_pk_constraint(table_name).get('constrained_columns', [])
    if not pk_cols:
        # Fallback to first column if no PK
        pk_cols = [columns[0]['name']]
        
    pk_str = ", ".join(f"`{k}`" for k in pk_cols)
    col_str = ", ".join(f"`{c}`" for c in text_columns)
    
    try:
        query = f"SELECT {pk_str}, {col_str} FROM `{table_name}`"
        rows = db.execute(text(query)).fetchall()
    except Exception as e:
        print(f"[ERROR] Failed to query table {table_name}: {e}")
        continue
        
    for r in rows:
        # Reconstruct PK as dict/string for logging
        pk_dict = {pk: r[i] for i, pk in enumerate(pk_cols)}
        pk_log = ", ".join(f"{k}={v}" for k, v in pk_dict.items())
        
        # Check each text column
        for idx, col in enumerate(text_columns):
            val = r[len(pk_cols) + idx]
            if not val or not isinstance(val, str):
                continue
            
            fixed = fix_text(val)
            if fixed != val:
                # Double check if the fixed text actually contains typical Vietnamese characters or different text
                # to avoid false positives (though false positives are extremely rare with CP437 -> UTF8 conversion)
                if table_name not in found_issues:
                    found_issues[table_name] = []
                found_issues[table_name].append({
                    "pk": pk_log,
                    "column": col,
                    "original": val,
                    "fixed": fixed
                })

if found_issues:
    print("\n!!! FOUND MOJIBAKE ISSUES !!!")
    for table, issues in found_issues.items():
        print(f"\nTable: {table} ({len(issues)} rows affected)")
        # Show up to 5 examples
        for issue in issues[:5]:
            print(f"  [{issue['pk']}] Column '{issue['column']}':")
            print(f"    Original: '{issue['original']}'")
            print(f"    Fixed:    '{issue['fixed']}'")
        if len(issues) > 5:
            print(f"  ... and {len(issues) - 5} more rows")
else:
    print("\n🎉 ALL TABLES ARE PERFECT! No encoding issues (mojibake) found.")

db.close()
