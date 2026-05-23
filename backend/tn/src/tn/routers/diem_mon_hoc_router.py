"""
DiemMonHoc router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import diem_mon_hoc_handler
from tn.models.diem_mon_hoc import DiemMonHocCreate, DiemMonHocUpdate, DiemMonHocResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/diem-mon-hoc", tags=["DiemMonHoc"])


@router.get("", response_model=List[DiemMonHocResponse])
def list_diem_mon_hoc(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_mon_hoc_handler.get_all(db)


@router.get("/{ma_diem}", response_model=DiemMonHocResponse)
def read_diem_mon_hoc(ma_diem: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_mon_hoc_handler.get_by_id(db, ma_diem)


@router.post("", response_model=DiemMonHocResponse, status_code=201)
def add_diem_mon_hoc(data: DiemMonHocCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_mon_hoc_handler.add(db, data)


@router.put("/{ma_diem}", response_model=DiemMonHocResponse)
def edit_diem_mon_hoc(ma_diem: str, data: DiemMonHocUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_mon_hoc_handler.edit(db, ma_diem, data)


@router.delete("/{ma_diem}")
def remove_diem_mon_hoc(ma_diem: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_mon_hoc_handler.remove(db, ma_diem)
