"""
NamHoc handler — CRUD business logic. Auto-generates MaNamHoc.
"""
from typing import List
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.nam_hoc import NamHoc, NamHocCreate, NamHocUpdate


def _gen_id():
    return "NH" + datetime.now().strftime("%y%m%d%H%M%S%f")[:14]


def get_all(db: Session) -> List[NamHoc]:
    return db.query(NamHoc).all()


def get_by_id(db: Session, ma_nam_hoc: str) -> NamHoc:
    obj = db.query(NamHoc).filter(NamHoc.MaNamHoc == ma_nam_hoc).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"NamHoc '{ma_nam_hoc}' không tìm thấy")
    return obj


def add(db: Session, data: NamHocCreate) -> NamHoc:
    dump = data.model_dump()
    if not dump.get("MaNamHoc"):
        dump["MaNamHoc"] = _gen_id()
    obj = NamHoc(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def edit(db: Session, ma_nam_hoc: str, data: NamHocUpdate) -> NamHoc:
    obj = get_by_id(db, ma_nam_hoc)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_nam_hoc: str) -> dict:
    obj = get_by_id(db, ma_nam_hoc)
    db.delete(obj)
    db.commit()
    return {"message": f"NamHoc '{ma_nam_hoc}' đã xóa thành công"}
