from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.utils.security import get_current_user
from tn.models.khoa_hoc import KhoaHocResponse, KhoaHocCreate, KhoaHocUpdate
from tn.handlers import khoa_hoc_handler

router = APIRouter(prefix="/api/v1/khoa-hoc", tags=["Khoa Hoc"])

@router.get("/", response_model=List[KhoaHocResponse])
def get_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return khoa_hoc_handler.get_all(db, skip, limit)

@router.get("/{ma_khoa}", response_model=KhoaHocResponse)
def get_by_id(ma_khoa: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return khoa_hoc_handler.get_by_id(db, ma_khoa)

@router.post("/", response_model=KhoaHocResponse)
def create(req: KhoaHocCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return khoa_hoc_handler.create(db, req)

@router.put("/{ma_khoa}", response_model=KhoaHocResponse)
def update(ma_khoa: str, req: KhoaHocUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return khoa_hoc_handler.update(db, ma_khoa, req)

@router.delete("/{ma_khoa}")
def delete(ma_khoa: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    khoa_hoc_handler.delete(db, ma_khoa)
    return {"message": "Xóa khóa học thành công"}
