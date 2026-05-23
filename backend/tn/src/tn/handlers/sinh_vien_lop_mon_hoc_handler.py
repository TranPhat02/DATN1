"""
SinhVien_LopMonHoc handler — CRUD business logic.
"""
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc, SinhVienLopMonHocCreate, SinhVienLopMonHocUpdate
from tn.models.diem_mon_hoc import DiemMonHoc
from tn.models.sinh_vien import SinhVien
from tn.models.lop_mon_hoc import LopMonHoc


def _attach_ten_sv(row: SinhVienLopMonHoc, db: Session) -> SinhVienLopMonHoc:
    """Attach TenSV by looking up SinhVien table."""
    sv = db.query(SinhVien).filter(SinhVien.MaSV == row.MaSV).first()
    if sv:
        row.TenSV = sv.TenSV  # type: ignore[attr-defined]
    return row


def _attach_latest_tong_ket(row: SinhVienLopMonHoc, db: Session) -> SinhVienLopMonHoc:
    """Keep enrollment TongKet aligned with the latest subject grade."""
    grade = db.query(DiemMonHoc).filter(
        DiemMonHoc.MaSV == row.MaSV,
        DiemMonHoc.MaLopMon == row.MaLopMon,
    ).first()
    if grade:
        row.TongKet = None if grade.DiemTK is None else str(grade.DiemTK)
    return row


def _attach_display_fields(row: SinhVienLopMonHoc, db: Session) -> SinhVienLopMonHoc:
    _attach_ten_sv(row, db)
    _attach_latest_tong_ket(row, db)
    return row


def get_all(db: Session) -> List[SinhVienLopMonHoc]:
    rows = db.query(SinhVienLopMonHoc).all()
    for row in rows:
        _attach_display_fields(row, db)
    return rows


def get_by_id(db: Session, ma_sv: str, ma_lop_mon: str) -> SinhVienLopMonHoc:
    obj = db.query(SinhVienLopMonHoc).filter(
        SinhVienLopMonHoc.MaSV == ma_sv,
        SinhVienLopMonHoc.MaLopMon == ma_lop_mon,
    ).first()
    if not obj:
        raise HTTPException(
            status_code=404,
            detail=f"SinhVienLopMonHoc ({ma_sv}, {ma_lop_mon}) không tìm thấy",
        )
    return _attach_display_fields(obj, db)


def add(db: Session, data: SinhVienLopMonHocCreate) -> SinhVienLopMonHoc:
    payload = data.model_dump()

    # Auto-detect HocGhep: True if student's MaLop != LopMonHoc's MaLop
    if payload.get('HocGhep') is None:
        sv = db.query(SinhVien).filter(SinhVien.MaSV == payload['MaSV']).first()
        lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == payload['MaLopMon']).first()
        if sv and lmh:
            payload['HocGhep'] = bool(sv.MaLop and lmh.MaLop and sv.MaLop != lmh.MaLop)
        else:
            payload['HocGhep'] = False

    obj = SinhVienLopMonHoc(**payload)
    db.add(obj)

    # Auto-create empty DiemMonHoc if not exists
    grade = db.query(DiemMonHoc).filter(
        DiemMonHoc.MaSV == obj.MaSV,
        DiemMonHoc.MaLopMon == obj.MaLopMon
    ).first()
    if not grade:
        import time
        new_grade = DiemMonHoc(
            MaDiem=f"D{int(time.time() * 1000) % 100000000}",
            MaSV=obj.MaSV,
            MaLopMon=obj.MaLopMon
        )
        db.add(new_grade)

    db.commit()
    db.refresh(obj)
    _attach_display_fields(obj, db)
    return obj


def edit(db: Session, ma_sv: str, ma_lop_mon: str, data: SinhVienLopMonHocUpdate) -> SinhVienLopMonHoc:
    obj = get_by_id(db, ma_sv, ma_lop_mon)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    _attach_display_fields(obj, db)
    return obj


def remove(db: Session, ma_sv: str, ma_lop_mon: str) -> dict:
    obj = get_by_id(db, ma_sv, ma_lop_mon)
    db.delete(obj)
    db.commit()
    return {"message": f"SinhVienLopMonHoc ({ma_sv}, {ma_lop_mon}) đã xóa thành công"}
