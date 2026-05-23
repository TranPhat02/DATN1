"""
DiemTracNghiem handler — CRUD business logic.
"""
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from sqlalchemy.orm import joinedload
from tn.models.diem_trac_nghiem import DiemTracNghiem, DiemTracNghiemCreate, DiemTracNghiemUpdate
from tn.models.sinh_vien import SinhVien
from tn.models.lop_mon_hoc import LopMonHoc
from tn.models.mon_hoc import MonHoc
from tn.models.lop import Lop


def get_all(db: Session) -> List[DiemTracNghiem]:
    records = db.query(DiemTracNghiem).options(
        joinedload(DiemTracNghiem.sinh_vien),
        joinedload(DiemTracNghiem.lop_mon_hoc).joinedload(LopMonHoc.mon_hoc),
        joinedload(DiemTracNghiem.lop_mon_hoc).joinedload(LopMonHoc.lop)
    ).all()
    
    for r in records:
        if r.sinh_vien:
            r.TenSV = r.sinh_vien.TenSV
            r.TenKhoa = r.sinh_vien.MaKhoa
        if r.lop_mon_hoc:
            if r.lop_mon_hoc.mon_hoc:
                r.TenMH = r.lop_mon_hoc.mon_hoc.TenMH
            if r.lop_mon_hoc.lop:
                r.TenLop = r.lop_mon_hoc.lop.TenLop
    return records


def get_by_id(db: Session, ma_tn: str) -> DiemTracNghiem:
    obj = db.query(DiemTracNghiem).filter(DiemTracNghiem.MaTN == ma_tn).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"DiemTracNghiem '{ma_tn}' không tìm thấy")
    return obj


def add(db: Session, data: DiemTracNghiemCreate) -> DiemTracNghiem:
    d = data.model_dump()
    if not d.get("MaTN"):
        import time
        d["MaTN"] = f"TN{int(time.time() * 1000) % 100000000}"
    obj = DiemTracNghiem(**d)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def edit(db: Session, ma_tn: str, data: DiemTracNghiemUpdate) -> DiemTracNghiem:
    obj = get_by_id(db, ma_tn)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_tn: str) -> dict:
    obj = get_by_id(db, ma_tn)
    db.delete(obj)
    db.commit()
    return {"message": f"DiemTracNghiem '{ma_tn}' đã xóa thành công"}
