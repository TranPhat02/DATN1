"""
DiemMonHoc handler — CRUD business logic.
"""
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.diem_mon_hoc import DiemMonHoc, DiemMonHocCreate, DiemMonHocUpdate
from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
from tn.models.lop_mon_hoc import LopMonHoc
from sqlalchemy.orm import joinedload


def calculate_grades(diem_gk: float, diem_ck: float):
    """Tính điểm TK, hệ 4 và điểm chữ tự động."""
    if diem_gk is None or diem_ck is None:
        return None, None, None
        
    diem_tk = round((diem_gk * 0.3) + (diem_ck * 0.7), 1)
    
    if diem_tk >= 8.5:
        diem_chu, diem_h4 = "A", 4.0
    elif diem_tk >= 8.0:
        diem_chu, diem_h4 = "B+", 3.5
    elif diem_tk >= 7.0:
        diem_chu, diem_h4 = "B", 3.0
    elif diem_tk >= 6.5:
        diem_chu, diem_h4 = "C+", 2.5
    elif diem_tk >= 5.5:
        diem_chu, diem_h4 = "C", 2.0
    elif diem_tk >= 5.0:
        diem_chu, diem_h4 = "D+", 1.5
    elif diem_tk >= 4.0:
        diem_chu, diem_h4 = "D", 1.0
    else:
        diem_chu, diem_h4 = "F", 0.0
        
    return diem_tk, diem_h4, diem_chu


def _format_tong_ket(diem_tk: float | None) -> str | None:
    return None if diem_tk is None else str(diem_tk)


def _sync_enrollment_tong_ket(db: Session, grade: DiemMonHoc) -> None:
    """Mirror DiemMonHoc.DiemTK to SinhVien_LopMonHoc.TongKet for admin views."""
    if not grade.MaSV or not grade.MaLopMon:
        return

    enrollment = db.query(SinhVienLopMonHoc).filter(
        SinhVienLopMonHoc.MaSV == grade.MaSV,
        SinhVienLopMonHoc.MaLopMon == grade.MaLopMon,
    ).first()

    if enrollment:
        enrollment.TongKet = _format_tong_ket(grade.DiemTK)
        return

    # Auto-detect HocGhep: compare student's MaLop with LopMonHoc's MaLop
    from tn.models.sinh_vien import SinhVien
    sv = db.query(SinhVien).filter(SinhVien.MaSV == grade.MaSV).first()
    lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == grade.MaLopMon).first()
    hoc_ghep = bool(sv and lmh and sv.MaLop and lmh.MaLop and sv.MaLop != lmh.MaLop)

    db.add(SinhVienLopMonHoc(
        MaSV=grade.MaSV,
        MaLopMon=grade.MaLopMon,
        TongKet=_format_tong_ket(grade.DiemTK),
        HocGhep=hoc_ghep,
    ))


def get_all(db: Session) -> List[DiemMonHoc]:
    records = db.query(DiemMonHoc).options(
        joinedload(DiemMonHoc.sinh_vien),
        joinedload(DiemMonHoc.lop_mon_hoc).joinedload(LopMonHoc.mon_hoc),
        joinedload(DiemMonHoc.lop_mon_hoc).joinedload(LopMonHoc.lop)
    ).all()
    
    # Inject TenMH for Pydantic response
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


def get_by_id(db: Session, ma_diem: str) -> DiemMonHoc:
    obj = db.query(DiemMonHoc).filter(DiemMonHoc.MaDiem == ma_diem).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"DiemMonHoc '{ma_diem}' không tìm thấy")
    return obj


def add(db: Session, data: DiemMonHocCreate) -> DiemMonHoc:
    d = data.model_dump()
    # Auto-generate MaDiem if empty
    if not d.get("MaDiem"):
        import time
        d["MaDiem"] = f"D{int(time.time() * 1000) % 100000000}"
    obj = DiemMonHoc(**d)
    
    # Auto-calc
    tk, h4, chu = calculate_grades(obj.DiemGK, obj.DiemCK)
    obj.DiemTK = tk
    obj.DiemH4 = h4
    obj.DiemChu = chu
    
    db.add(obj)
    
    _sync_enrollment_tong_ket(db, obj)

    db.commit()
    db.refresh(obj)
    return obj


def edit(db: Session, ma_diem: str, data: DiemMonHocUpdate) -> DiemMonHoc:
    obj = get_by_id(db, ma_diem)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
        
    # Auto-calc after assigning new values
    tk, h4, chu = calculate_grades(obj.DiemGK, obj.DiemCK)
    obj.DiemTK = tk
    obj.DiemH4 = h4
    obj.DiemChu = chu
    _sync_enrollment_tong_ket(db, obj)
        
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_diem: str) -> dict:
    obj = get_by_id(db, ma_diem)
    db.delete(obj)
    db.commit()
    return {"message": f"DiemMonHoc '{ma_diem}' đã xóa thành công"}
