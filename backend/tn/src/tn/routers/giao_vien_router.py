"""
GiaoVien router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import giao_vien_handler
from tn.models.giao_vien import GiaoVienCreate, GiaoVienUpdate, GiaoVienResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/giao-vien", tags=["GiaoVien"])


@router.get("/", response_model=List[GiaoVienResponse])
def list_giao_vien(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return giao_vien_handler.get_all(db)


@router.get("/{ma_gv}", response_model=GiaoVienResponse)
def read_giao_vien(ma_gv: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return giao_vien_handler.get_by_id(db, ma_gv)


@router.post("/", response_model=GiaoVienResponse, status_code=201)
def add_giao_vien(data: GiaoVienCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return giao_vien_handler.add(db, data)


@router.put("/{ma_gv}", response_model=GiaoVienResponse)
def edit_giao_vien(ma_gv: str, data: GiaoVienUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return giao_vien_handler.edit(db, ma_gv, data)


@router.delete("/{ma_gv}")
def remove_giao_vien(ma_gv: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return giao_vien_handler.remove(db, ma_gv)
