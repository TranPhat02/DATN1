"""
Lop handler — CRUD business logic. Auto-generates MaLop.
"""
from typing import List
from datetime import datetime
import re
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.lop import Lop, LopCreate, LopUpdate





def get_all(db: Session) -> List[Lop]:
    return db.query(Lop).all()


def get_by_id(db: Session, ma_lop: str) -> Lop:
    obj = db.query(Lop).filter(Lop.MaLop == ma_lop).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"Lop '{ma_lop}' không tìm thấy")
    return obj


def add(db: Session, data: LopCreate) -> Lop:
    dump = data.model_dump()
    
    # Kiem tra ma lop da ton tai chua
    exist = db.query(Lop).filter(Lop.MaLop == dump.get("MaLop")).first()
    if exist:
        raise HTTPException(status_code=400, detail=f"Mã Lớp '{dump.get('MaLop')}' đã tồn tại")
        
    obj = Lop(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def edit(db: Session, ma_lop: str, data: LopUpdate) -> Lop:
    obj = get_by_id(db, ma_lop)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_lop: str) -> dict:
    obj = get_by_id(db, ma_lop)
    db.delete(obj)
    db.commit()
    return {"message": f"Lop '{ma_lop}' đã xóa thành công"}
