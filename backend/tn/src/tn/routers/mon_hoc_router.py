"""
MonHoc router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import mon_hoc_handler
from tn.models.mon_hoc import MonHocCreate, MonHocUpdate, MonHocResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/mon-hoc", tags=["MonHoc"])


@router.get("/", response_model=List[MonHocResponse])
def list_mon_hoc(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return mon_hoc_handler.get_all(db)


@router.get("/{ma_mh}", response_model=MonHocResponse)
def read_mon_hoc(ma_mh: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return mon_hoc_handler.get_by_id(db, ma_mh)


@router.post("/", response_model=MonHocResponse, status_code=201)
def add_mon_hoc(data: MonHocCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return mon_hoc_handler.add(db, data)


@router.put("/{ma_mh}", response_model=MonHocResponse)
def edit_mon_hoc(ma_mh: str, data: MonHocUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return mon_hoc_handler.edit(db, ma_mh, data)


@router.delete("/{ma_mh}")
def remove_mon_hoc(ma_mh: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return mon_hoc_handler.remove(db, ma_mh)
