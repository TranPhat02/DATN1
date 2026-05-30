"""
SinhVien_LopMonHoc router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import sinh_vien_lop_mon_hoc_handler
from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHocCreate, SinhVienLopMonHocUpdate, SinhVienLopMonHocResponse
from tn.models.tai_khoan import TaiKhoan
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/sv-lop-mon-hoc", tags=["SinhVienLopMonHoc"])


@router.get("", response_model=List[SinhVienLopMonHocResponse])
def list_sv_lmh(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_lop_mon_hoc_handler.get_all(db)


@router.get("/by-sv/{ma_sv}", response_model=List[SinhVienLopMonHocResponse])
def list_by_sv(
    ma_sv: str,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user),
):
    """Get all class enrollments for a specific student.
    Students can only fetch their own data (username == MaSV).
    Admins/teachers can fetch any student.
    """
    if current_user.Role == "student" and current_user.UserName.upper() != ma_sv.upper():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Không có quyền xem dữ liệu của sinh viên khác")
    from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
    rows = db.query(SinhVienLopMonHoc).filter(SinhVienLopMonHoc.MaSV == ma_sv).all()
    for row in rows:
        sinh_vien_lop_mon_hoc_handler._attach_display_fields(row, db)
    return rows


@router.get("/by-lop-mon/{ma_lop_mon}", response_model=List[SinhVienLopMonHocResponse])
def list_by_lop_mon(
    ma_lop_mon: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get all students enrolled in a specific class-subject.
    
    Auto-syncs: creates SinhVienLopMonHoc + DiemMonHoc for any student
    in the class (MaLop) who hasn't been enrolled yet — no student login needed.
    """
    import uuid
    from tn.models.lop_mon_hoc import LopMonHoc
    from tn.models.sinh_vien import SinhVien
    from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
    from tn.models.diem_mon_hoc import DiemMonHoc

    # Find the LopMonHoc to get its MaLop
    lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == ma_lop_mon).first()
    if lmh and lmh.MaLop:
        # Find ALL students in that class
        students = db.query(SinhVien).filter(SinhVien.MaLop == lmh.MaLop).all()
        synced = 0
        for sv in students:
            # Auto-create enrollment record if missing
            enrollment = db.query(SinhVienLopMonHoc).filter(
                SinhVienLopMonHoc.MaSV == sv.MaSV,
                SinhVienLopMonHoc.MaLopMon == ma_lop_mon,
            ).first()
            if not enrollment:
                db.add(SinhVienLopMonHoc(
                    MaSV=sv.MaSV,
                    MaLopMon=ma_lop_mon,
                    TongKet=None,
                    HocGhep=bool(sv.MaLop and lmh.MaLop and sv.MaLop != lmh.MaLop),
                ))
                synced += 1

            # Auto-create empty DiemMonHoc if missing
            existing_diem = db.query(DiemMonHoc).filter(
                DiemMonHoc.MaSV == sv.MaSV,
                DiemMonHoc.MaLopMon == ma_lop_mon,
            ).first()
            if not existing_diem:
                db.add(DiemMonHoc(
                    MaDiem=f"D{uuid.uuid4().hex[:12].upper()}",
                    MaSV=sv.MaSV,
                    MaLopMon=ma_lop_mon,
                ))

        if synced > 0:
            db.commit()
            print(f"[AutoSync] Đã ghi danh {synced} SV mới vào lớp '{ma_lop_mon}'")

    # Return all enrolled students (now complete)
    rows = db.query(SinhVienLopMonHoc).filter(SinhVienLopMonHoc.MaLopMon == ma_lop_mon).all()
    for row in rows:
        sinh_vien_lop_mon_hoc_handler._attach_display_fields(row, db)
    return rows


@router.get("/{ma_sv}/{ma_lop_mon}", response_model=SinhVienLopMonHocResponse)
def read_sv_lmh(ma_sv: str, ma_lop_mon: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_lop_mon_hoc_handler.get_by_id(db, ma_sv, ma_lop_mon)


@router.post("", response_model=SinhVienLopMonHocResponse, status_code=201)
def add_sv_lmh(data: SinhVienLopMonHocCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_lop_mon_hoc_handler.add(db, data)


@router.put("/{ma_sv}/{ma_lop_mon}", response_model=SinhVienLopMonHocResponse)
def edit_sv_lmh(ma_sv: str, ma_lop_mon: str, data: SinhVienLopMonHocUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_lop_mon_hoc_handler.edit(db, ma_sv, ma_lop_mon, data)


@router.delete("/{ma_sv}/{ma_lop_mon}")
def remove_sv_lmh(ma_sv: str, ma_lop_mon: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_lop_mon_hoc_handler.remove(db, ma_sv, ma_lop_mon)


@router.post("/sync/{ma_sv}")
def sync_enrollment(
    ma_sv: str,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user),
):
    """Auto-sync a student's class enrollments based on their MaLop.

    Creates missing SinhVienLopMonHoc + DiemMonHoc records for any
    LopMonHoc that matches the student's MaLop but has no enrollment yet.

    Called automatically when a student opens their classroom list.
    Students can only sync their own data.
    """
    import time
    from fastapi import HTTPException
    from tn.models.sinh_vien import SinhVien
    from tn.models.lop_mon_hoc import LopMonHoc
    from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
    from tn.models.diem_mon_hoc import DiemMonHoc

    # Security: student can only sync their own data
    if current_user.Role == "student" and current_user.UserName.upper() != ma_sv.upper():
        raise HTTPException(status_code=403, detail="Không có quyền sync dữ liệu của sinh viên khác")

    # Look up student
    sv = db.query(SinhVien).filter(SinhVien.MaSV == ma_sv).first()
    if not sv:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy sinh viên '{ma_sv}'")

    if not sv.MaLop:
        return {"synced": 0, "message": "Sinh viên chưa có mã lớp, không thể tự động đăng ký"}

    # Get all LopMonHoc for students's class
    lop_mon_hoc_list = db.query(LopMonHoc).filter(LopMonHoc.MaLop == sv.MaLop).all()

    synced = 0
    for idx, lmh in enumerate(lop_mon_hoc_list):
        # Ensure SinhVienLopMonHoc record exists
        enrollment = db.query(SinhVienLopMonHoc).filter(
            SinhVienLopMonHoc.MaSV == ma_sv,
            SinhVienLopMonHoc.MaLopMon == lmh.MaLopMon,
        ).first()
        if not enrollment:
            db.add(SinhVienLopMonHoc(
                MaSV=ma_sv,
                MaLopMon=lmh.MaLopMon,
                TongKet=None,
                HocGhep=bool(sv.MaLop and lmh.MaLop and sv.MaLop != lmh.MaLop),
            ))
            synced += 1

        # Ensure DiemMonHoc record exists
        existing_diem = db.query(DiemMonHoc).filter(
            DiemMonHoc.MaSV == ma_sv,
            DiemMonHoc.MaLopMon == lmh.MaLopMon,
        ).first()
        if not existing_diem:
            db.add(DiemMonHoc(
                MaDiem=f"D{int(time.time() * 1000) % 100000000}{idx:02d}",
                MaSV=ma_sv,
                MaLopMon=lmh.MaLopMon,
            ))

    if synced > 0:
        db.commit()
        print(f"[Sync] Đã tạo {synced} bản ghi enrollment mới cho SV '{ma_sv}' (lớp '{sv.MaLop}')")

    return {
        "synced": synced,
        "total": len(lop_mon_hoc_list),
        "message": f"Đã đồng bộ {synced}/{len(lop_mon_hoc_list)} lớp môn học cho sinh viên '{ma_sv}'",
    }
