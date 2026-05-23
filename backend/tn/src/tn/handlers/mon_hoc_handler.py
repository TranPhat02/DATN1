"""
MonHoc handler — CRUD business logic.
Auto-generates MaMH. Creates Google Drive folder on add.
"""
from typing import List
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
import threading

from tn.models.mon_hoc import MonHoc, MonHocCreate, MonHocUpdate


def _gen_id():
    return "MH" + datetime.now().strftime("%y%m%d%H%M%S%f")[:14]


def _create_drive_folder(ten_mh: str):
    """Create a Google Drive folder for this subject (runs in background thread)."""
    try:
        from tn.handlers.drive_handler import _get_drive_service, _get_or_create_subject_folder
        service = _get_drive_service()
        folder_id = _get_or_create_subject_folder(service, ten_mh)
        print(f"[Drive] Đã tạo folder môn học '{ten_mh}' (id={folder_id})")
    except Exception as e:
        print(f"[Drive] Không tạo được folder cho môn '{ten_mh}': {e}")


def get_all(db: Session) -> List[MonHoc]:
    return db.query(MonHoc).all()


def get_by_id(db: Session, ma_mh: str) -> MonHoc:
    obj = db.query(MonHoc).filter(MonHoc.MaMH == ma_mh).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"MonHoc '{ma_mh}' không tìm thấy")
    return obj


def add(db: Session, data: MonHocCreate) -> MonHoc:
    dump = data.model_dump()
    if not dump.get("MaMH"):
        dump["MaMH"] = _gen_id()
    obj = MonHoc(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # Create Drive folder for this subject in background thread
    threading.Thread(target=_create_drive_folder, args=(obj.TenMH,), daemon=True).start()

    return obj


def edit(db: Session, ma_mh: str, data: MonHocUpdate) -> MonHoc:
    obj = get_by_id(db, ma_mh)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_mh: str) -> dict:
    obj = get_by_id(db, ma_mh)
    db.delete(obj)
    db.commit()
    return {"message": f"MonHoc '{ma_mh}' đã xóa thành công"}
