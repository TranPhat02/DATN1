"""
DiemTracNghiem router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import diem_trac_nghiem_handler
from tn.models.diem_trac_nghiem import DiemTracNghiemCreate, DiemTracNghiemUpdate, DiemTracNghiemResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/diem-trac-nghiem", tags=["DiemTracNghiem"])


@router.get("", response_model=List[DiemTracNghiemResponse])
def list_diem_trac_nghiem(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_trac_nghiem_handler.get_all(db)


@router.get("/{ma_tn}", response_model=DiemTracNghiemResponse)
def read_diem_trac_nghiem(ma_tn: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_trac_nghiem_handler.get_by_id(db, ma_tn)


@router.post("", response_model=DiemTracNghiemResponse, status_code=201)
def add_diem_trac_nghiem(data: DiemTracNghiemCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_trac_nghiem_handler.add(db, data)


@router.put("/{ma_tn}", response_model=DiemTracNghiemResponse)
def edit_diem_trac_nghiem(ma_tn: str, data: DiemTracNghiemUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_trac_nghiem_handler.edit(db, ma_tn, data)


@router.delete("/{ma_tn}")
def remove_diem_trac_nghiem(ma_tn: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return diem_trac_nghiem_handler.remove(db, ma_tn)
