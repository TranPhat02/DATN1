"""
SinhVien router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import sinh_vien_handler
from tn.models.sinh_vien import SinhVienCreate, SinhVienUpdate, SinhVienResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/sinh-vien", tags=["SinhVien"])


@router.get("/", response_model=List[SinhVienResponse])
def list_sinh_vien(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_handler.get_all(db)


@router.get("/{ma_sv}", response_model=SinhVienResponse)
def read_sinh_vien(ma_sv: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_handler.get_by_id(db, ma_sv)


@router.post("/", response_model=SinhVienResponse, status_code=201)
def add_sinh_vien(data: SinhVienCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_handler.add(db, data)


@router.put("/{ma_sv}", response_model=SinhVienResponse)
def edit_sinh_vien(ma_sv: str, data: SinhVienUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_handler.edit(db, ma_sv, data)


@router.delete("/{ma_sv}")
def remove_sinh_vien(ma_sv: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return sinh_vien_handler.remove(db, ma_sv)
