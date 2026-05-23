"""
NamHoc router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import nam_hoc_handler
from tn.models.nam_hoc import NamHocCreate, NamHocUpdate, NamHocResponse
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/nam-hoc", tags=["NamHoc"])


@router.get("/", response_model=List[NamHocResponse])
def list_nam_hoc(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return nam_hoc_handler.get_all(db)


@router.get("/{ma_nam_hoc}", response_model=NamHocResponse)
def read_nam_hoc(ma_nam_hoc: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return nam_hoc_handler.get_by_id(db, ma_nam_hoc)


@router.post("/", response_model=NamHocResponse, status_code=201)
def add_nam_hoc(data: NamHocCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return nam_hoc_handler.add(db, data)


@router.put("/{ma_nam_hoc}", response_model=NamHocResponse)
def edit_nam_hoc(ma_nam_hoc: str, data: NamHocUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return nam_hoc_handler.edit(db, ma_nam_hoc, data)


@router.delete("/{ma_nam_hoc}")
def remove_nam_hoc(ma_nam_hoc: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return nam_hoc_handler.remove(db, ma_nam_hoc)
