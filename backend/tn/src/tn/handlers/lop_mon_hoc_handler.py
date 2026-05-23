"""
LopMonHoc handler — CRUD business logic.
Auto-generates MaLopMon. Creates Drive subfolder (MonHoc/GiaoVien) in background on add.
Auto-creates SinhVienLopMonHoc records for all students in the class on add.
"""
from typing import List
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
import threading

from tn.models.lop_mon_hoc import LopMonHoc, LopMonHocCreate, LopMonHocUpdate
from tn.models.mon_hoc import MonHoc
from tn.models.giao_vien import GiaoVien
from tn.models.lop import Lop
from tn.models.hoc_ki import HocKi


def _gen_id():
    return "LM" + datetime.now().strftime("%y%m%d%H%M%S%f")[:14]


def _attach_joined(obj: LopMonHoc, db: Session) -> LopMonHoc:
    """Attach joined fields: TenMH, TenGV, TenLop, TenHocKi, MaNamHoc."""
    if obj.MaMH:
        mh = db.query(MonHoc).filter(MonHoc.MaMH == obj.MaMH).first()
        obj.TenMH = mh.TenMH if mh else None  # type: ignore[attr-defined]
    if obj.MaGV:
        gv = db.query(GiaoVien).filter(GiaoVien.MaGV == obj.MaGV).first()
        obj.TenGV = gv.TenGV if gv else None  # type: ignore[attr-defined]
    if obj.MaLop:
        lop = db.query(Lop).filter(Lop.MaLop == obj.MaLop).first()
        obj.TenLop = lop.TenLop if lop else None  # type: ignore[attr-defined]
    if obj.MaHocKi:
        hk = db.query(HocKi).filter(HocKi.MaHocKi == obj.MaHocKi).first()
        obj.TenHocKi = hk.TenHocKi if hk else None  # type: ignore[attr-defined]
        obj.MaNamHoc = hk.MaNamHoc if hk else None  # type: ignore[attr-defined]
    return obj


def _create_drive_subfolder(ten_mh: str, ten_gv: str):
    """Create Drive subfolder: root/MonHoc/GiaoVien (runs in background thread)."""
    try:
        from tn.handlers.drive_handler import _get_drive_service, _get_or_create_subject_folder, _get_or_create_subfolder
        service = _get_drive_service()
        subject_folder_id = _get_or_create_subject_folder(service, ten_mh)
        teacher_folder_id = _get_or_create_subfolder(service, subject_folder_id, ten_gv)
        print(f"[Drive] Đã tạo subfolder '{ten_mh}/{ten_gv}' (id={teacher_folder_id})")
    except Exception as e:
        print(f"[Drive] Không tạo subfolder '{ten_gv}' trong '{ten_mh}': {e}")


def _auto_enroll_students(db: Session, lmh: LopMonHoc):
    """Auto-create SinhVienLopMonHoc + DiemMonHoc for all students in the class."""
    import uuid
    from tn.models.sinh_vien import SinhVien
    from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
    from tn.models.diem_mon_hoc import DiemMonHoc

    if not lmh.MaLop:
        return

    students = db.query(SinhVien).filter(SinhVien.MaLop == lmh.MaLop).all()
    synced = 0
    for sv in students:
        # Ensure SinhVienLopMonHoc record exists
        enrollment = db.query(SinhVienLopMonHoc).filter(
            SinhVienLopMonHoc.MaSV == sv.MaSV,
            SinhVienLopMonHoc.MaLopMon == lmh.MaLopMon,
        ).first()
        if not enrollment:
            db.add(SinhVienLopMonHoc(
                MaSV=sv.MaSV,
                MaLopMon=lmh.MaLopMon,
                TongKet=None,
                HocGhep=False,
            ))
            synced += 1

        # Ensure DiemMonHoc record exists
        existing_diem = db.query(DiemMonHoc).filter(
            DiemMonHoc.MaSV == sv.MaSV,
            DiemMonHoc.MaLopMon == lmh.MaLopMon,
        ).first()
        if not existing_diem:
            db.add(DiemMonHoc(
                MaDiem=f"D{uuid.uuid4().hex[:12].upper()}",
                MaSV=sv.MaSV,
                MaLopMon=lmh.MaLopMon,
            ))

    if synced > 0:
        db.commit()
        print(f"[AutoEnroll] Đã tạo {synced} bản ghi enrollment cho lớp '{lmh.MaLopMon}' (lớp '{lmh.MaLop}')")


def _remove_old_class_students(db: Session, lmh: LopMonHoc, old_ma_lop: str):
    """Remove SinhVienLopMonHoc + DiemMonHoc for students of the OLD class
    that are NOT HocGhep (cross-enrolled)."""
    from tn.models.sinh_vien import SinhVien
    from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
    from tn.models.diem_mon_hoc import DiemMonHoc

    if not old_ma_lop:
        return

    # All students belonging to the OLD class
    old_students = db.query(SinhVien).filter(SinhVien.MaLop == old_ma_lop).all()
    old_sv_ids = {sv.MaSV for sv in old_students}

    if not old_sv_ids:
        return

    # All enrollments in this LopMon for students of the old class (non-HocGhep only)
    enrollments = db.query(SinhVienLopMonHoc).filter(
        SinhVienLopMonHoc.MaLopMon == lmh.MaLopMon,
        SinhVienLopMonHoc.MaSV.in_(old_sv_ids),
        SinhVienLopMonHoc.HocGhep == False,
    ).all()

    removed = 0
    for enroll in enrollments:
        # Remove matching DiemMonHoc
        db.query(DiemMonHoc).filter(
            DiemMonHoc.MaSV == enroll.MaSV,
            DiemMonHoc.MaLopMon == lmh.MaLopMon,
        ).delete()
        # Remove enrollment
        db.delete(enroll)
        removed += 1

    if removed > 0:
        db.commit()
        print(f"[AutoEnroll] Đã xóa {removed} enrollment cũ (lớp '{old_ma_lop}') khỏi '{lmh.MaLopMon}'")


def get_all(db: Session) -> List[LopMonHoc]:
    rows = db.query(LopMonHoc).all()
    for row in rows:
        _attach_joined(row, db)
    return rows


def get_by_id(db: Session, ma_lop_mon: str) -> LopMonHoc:
    obj = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == ma_lop_mon).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"LopMonHoc '{ma_lop_mon}' không tìm thấy")
    _attach_joined(obj, db)
    return obj


def add(db: Session, data: LopMonHocCreate) -> LopMonHoc:
    dump = data.model_dump()
    if not dump.get("MaLopMon"):
        dump["MaLopMon"] = _gen_id()
    obj = LopMonHoc(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # Auto-enroll all students in the class
    try:
        _auto_enroll_students(db, obj)
    except Exception as e:
        print(f"[AutoEnroll] Lỗi khi tự động ghi danh SV: {e}")

    # Create Drive subfolder: MonHoc / GiaoVien in background thread
    try:
        mh = db.query(MonHoc).filter(MonHoc.MaMH == obj.MaMH).first() if obj.MaMH else None
        gv = db.query(GiaoVien).filter(GiaoVien.MaGV == obj.MaGV).first() if obj.MaGV else None
        if mh and gv:
            threading.Thread(
                target=_create_drive_subfolder,
                args=(mh.TenMH, gv.TenGV),
                daemon=True,
            ).start()
    except Exception as e:
        print(f"[Drive] Error starting subfolder thread: {e}")

    _attach_joined(obj, db)
    return obj


def edit(db: Session, ma_lop_mon: str, data: LopMonHocUpdate) -> LopMonHoc:
    obj = get_by_id(db, ma_lop_mon)
    old_ma_lop = obj.MaLop
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)

    # If MaLop changed, remove old class students then enroll new class students
    if data.MaLop and data.MaLop != old_ma_lop:
        try:
            _remove_old_class_students(db, obj, old_ma_lop)
            _auto_enroll_students(db, obj)
        except Exception as e:
            print(f"[AutoEnroll] Lỗi khi tự động ghi danh SV sau edit: {e}")

    _attach_joined(obj, db)
    return obj


def remove(db: Session, ma_lop_mon: str) -> dict:
    obj = get_by_id(db, ma_lop_mon)
    db.delete(obj)
    db.commit()
    return {"message": f"LopMonHoc '{ma_lop_mon}' đã xóa thành công"}
