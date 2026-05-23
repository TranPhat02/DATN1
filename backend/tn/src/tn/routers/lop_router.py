"""
Lop router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import lop_handler
from tn.models.lop import LopCreate, LopUpdate, LopResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/lop", tags=["Lop"])


@router.get("/", response_model=List[LopResponse])
def list_lop(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_handler.get_all(db)


@router.get("/{ma_lop}", response_model=LopResponse)
def read_lop(ma_lop: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_handler.get_by_id(db, ma_lop)


@router.post("/", response_model=LopResponse, status_code=201)
def add_lop(data: LopCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_handler.add(db, data)


@router.put("/{ma_lop}", response_model=LopResponse)
def edit_lop(ma_lop: str, data: LopUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_handler.edit(db, ma_lop, data)


@router.delete("/{ma_lop}")
def remove_lop(ma_lop: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lop_handler.remove(db, ma_lop)
