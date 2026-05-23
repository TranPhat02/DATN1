from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://admin:123456@localhost:3308/tn')
with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA='tn' AND TABLE_NAME='LopMonHoc' AND COLUMN_NAME='TenLopMon'"
    ))
    count = result.scalar()
    if count == 0:
        conn.execute(text('ALTER TABLE LopMonHoc ADD COLUMN TenLopMon TEXT NULL'))
        conn.commit()
        print('OK: Added TenLopMon column to LopMonHoc')
    else:
        print('SKIP: TenLopMon already exists')
