"""
HocKi handler — CRUD business logic. Auto-generates MaHocKi.
"""
from typing import List
from datetime import datetime
import re
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.hoc_ki import HocKi, HocKiCreate, HocKiUpdate
from tn.models.nam_hoc import NamHoc


def _generate_ma_hoc_ki(db: Session, ten_hoc_ki: str, ma_nam_hoc: str) -> str:
    digits = re.sub(r'\D', '', str(ten_hoc_ki))
    hk = digits if digits else "1"
    
    suffix = "UNK"
    if ma_nam_hoc:
        nh = db.query(NamHoc).filter(NamHoc.MaNamHoc == ma_nam_hoc).first()
        if nh and nh.NamHoc:
            years = re.findall(r'\d{4}', nh.NamHoc)
            if len(years) >= 2:
                suffix = f"{years[0][-2:]}{years[1][-2:]}"
            else:
                d = re.sub(r'\D', '', nh.NamHoc)
                suffix = d if d else "UNK"

    return f"HK{hk}_{suffix}"


def get_all(db: Session) -> List[HocKi]:
    return db.query(HocKi).all()


def get_by_id(db: Session, ma_hoc_ki: str) -> HocKi:
    obj = db.query(HocKi).filter(HocKi.MaHocKi == ma_hoc_ki).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"HocKi '{ma_hoc_ki}' không tìm thấy")
    return obj


def add(db: Session, data: HocKiCreate) -> HocKi:
    dump = data.model_dump()
    if not dump.get("MaHocKi"):
        dump["MaHocKi"] = _generate_ma_hoc_ki(db, dump.get("TenHocKi", ""), dump.get("MaNamHoc", ""))
    obj = HocKi(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def edit(db: Session, ma_hoc_ki: str, data: HocKiUpdate) -> HocKi:
    obj = get_by_id(db, ma_hoc_ki)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_hoc_ki: str) -> dict:
    obj = get_by_id(db, ma_hoc_ki)
    db.delete(obj)
    db.commit()
    return {"message": f"HocKi '{ma_hoc_ki}' đã xóa thành công"}
