from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from tn.models.khoa_hoc import KhoaHoc, KhoaHocCreate, KhoaHocUpdate

def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[KhoaHoc]:
    return db.query(KhoaHoc).offset(skip).limit(limit).all()

def get_by_id(db: Session, ma_khoa: str) -> Optional[KhoaHoc]:
    return db.query(KhoaHoc).filter(KhoaHoc.MaKhoa == ma_khoa).first()

def create(db: Session, req: KhoaHocCreate) -> KhoaHoc:
    exist = get_by_id(db, req.MaKhoa)
    if exist:
        raise HTTPException(status_code=400, detail="Mã khóa học đã tồn tại")
    db_obj = KhoaHoc(
        MaKhoa=req.MaKhoa,
        TenKhoa=req.TenKhoa
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, ma_khoa: str, req: KhoaHocUpdate) -> KhoaHoc:
    db_obj = get_by_id(db, ma_khoa)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học")
    
    if req.TenKhoa is not None:
        db_obj.TenKhoa = req.TenKhoa

    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete(db: Session, ma_khoa: str) -> None:
    db_obj = get_by_id(db, ma_khoa)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học")
    
    # Check if used? (Optional, maybe foreign keys will block it)
    try:
        db.delete(db_obj)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Xóa thất bại. Khóa học có thể đang chứa dữ liệu sinh viên/lớp.")
