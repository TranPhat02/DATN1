"""
LopMonHoc router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import lop_mon_hoc_handler
from tn.models.lop_mon_hoc import LopMonHocCreate, LopMonHocUpdate, LopMonHocResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/lop-mon-hoc", tags=["LopMonHoc"])


@router.get("/", response_model=List[LopMonHocResponse])
def list_lop_mon_hoc(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_mon_hoc_handler.get_all(db)


@router.get("/{ma_lop_mon}", response_model=LopMonHocResponse)
def read_lop_mon_hoc(ma_lop_mon: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_mon_hoc_handler.get_by_id(db, ma_lop_mon)


@router.post("/", response_model=LopMonHocResponse, status_code=201)
def add_lop_mon_hoc(data: LopMonHocCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_mon_hoc_handler.add(db, data)


@router.put("/{ma_lop_mon}", response_model=LopMonHocResponse)
def edit_lop_mon_hoc(ma_lop_mon: str, data: LopMonHocUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_mon_hoc_handler.edit(db, ma_lop_mon, data)


@router.delete("/{ma_lop_mon}")
def remove_lop_mon_hoc(ma_lop_mon: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_mon_hoc_handler.remove(db, ma_lop_mon)
