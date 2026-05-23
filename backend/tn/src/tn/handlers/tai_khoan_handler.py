"""
TaiKhoan handler — CRUD business logic.
"""
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.tai_khoan import TaiKhoan, TaiKhoanCreate, TaiKhoanUpdate
from tn.utils.security import hash_password


def get_all(db: Session) -> List[TaiKhoan]:
    return db.query(TaiKhoan).all()


def get_by_id(db: Session, username: str) -> TaiKhoan:
    obj = db.query(TaiKhoan).filter(TaiKhoan.UserName == username).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"TaiKhoan '{username}' không tìm thấy")
    return obj


def add(db: Session, data: TaiKhoanCreate) -> TaiKhoan:
    existing = db.query(TaiKhoan).filter(TaiKhoan.UserName == data.UserName).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"UserName '{data.UserName}' đã tồn tại")
    obj = TaiKhoan(
        UserName=data.UserName,
        Password=hash_password(data.Password),
        Role=data.Role,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def edit(db: Session, username: str, data: TaiKhoanUpdate) -> TaiKhoan:
    obj = get_by_id(db, username)
    update_fields = data.model_dump(exclude_unset=True)
    if "Password" in update_fields and update_fields["Password"]:
        update_fields["Password"] = hash_password(update_fields["Password"])
    for field, value in update_fields.items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, username: str) -> dict:
    obj = get_by_id(db, username)
    db.delete(obj)
    db.commit()
    return {"message": f"TaiKhoan '{username}' đã xóa thành công"}
