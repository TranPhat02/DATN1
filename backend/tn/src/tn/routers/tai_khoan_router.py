"""
TaiKhoan router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import tai_khoan_handler
from tn.models.tai_khoan import TaiKhoanCreate, TaiKhoanUpdate, TaiKhoanResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/tai-khoan", tags=["TaiKhoan"])


@router.get("/", response_model=List[TaiKhoanResponse])
def list_tai_khoan(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return tai_khoan_handler.get_all(db)


@router.get("/{username}", response_model=TaiKhoanResponse)
def read_tai_khoan(username: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return tai_khoan_handler.get_by_id(db, username)


@router.post("/", response_model=TaiKhoanResponse, status_code=201)
def add_tai_khoan(data: TaiKhoanCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return tai_khoan_handler.add(db, data)


@router.put("/{username}", response_model=TaiKhoanResponse)
def edit_tai_khoan(username: str, data: TaiKhoanUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return tai_khoan_handler.edit(db, username, data)


@router.delete("/{username}")
def remove_tai_khoan(username: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return tai_khoan_handler.remove(db, username)
