"""
HocKi router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import hoc_ki_handler
from tn.models.hoc_ki import HocKiCreate, HocKiUpdate, HocKiResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/hoc-ki", tags=["HocKi"])


@router.get("/", response_model=List[HocKiResponse])
def list_hoc_ki(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return hoc_ki_handler.get_all(db)


@router.get("/{ma_hoc_ki}", response_model=HocKiResponse)
def read_hoc_ki(ma_hoc_ki: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return hoc_ki_handler.get_by_id(db, ma_hoc_ki)


@router.post("/", response_model=HocKiResponse, status_code=201)
def add_hoc_ki(data: HocKiCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return hoc_ki_handler.add(db, data)


@router.put("/{ma_hoc_ki}", response_model=HocKiResponse)
def edit_hoc_ki(ma_hoc_ki: str, data: HocKiUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return hoc_ki_handler.edit(db, ma_hoc_ki, data)


@router.delete("/{ma_hoc_ki}")
def remove_hoc_ki(ma_hoc_ki: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return hoc_ki_handler.remove(db, ma_hoc_ki)
