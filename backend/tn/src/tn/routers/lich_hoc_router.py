"""
LichHoc router — REST API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import lich_hoc_handler
from tn.models.lich_hoc import LichHocCreate, LichHocUpdate
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/lich-hoc", tags=["LichHoc"])


@router.get("/")
def list_lich_hoc(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lich_hoc_handler.get_all(db)


@router.get("/{ma_lich}")
def read_lich_hoc(ma_lich: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lich_hoc_handler.get_by_id(db, ma_lich)


@router.post("/", status_code=201)
def add_lich_hoc(data: LichHocCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lich_hoc_handler.add(db, data)


@router.put("/{ma_lich}")
def edit_lich_hoc(ma_lich: str, data: LichHocUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lich_hoc_handler.edit(db, ma_lich, data)


@router.delete("/{ma_lich}")
def remove_lich_hoc(ma_lich: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return lich_hoc_handler.remove(db, ma_lich)


@router.post("/auto-generate", status_code=201)
def auto_generate(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Auto-generate LichHoc records for all LopMonHoc that don't have a schedule yet."""
    return lich_hoc_handler.auto_generate(db)


@router.post("/import-csv", status_code=201)
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Import LichHoc records from a CSV file.
    
    Expected columns (semicolon or comma separated):
    MaLopMon;Thu;Ca;PhongHoc;NgayBatDau;NgayKetThuc
    """
    import io
    import csv as csv_module
    content = await file.read()
    text = content.decode("utf-8-sig")
    # Auto-detect delimiter
    dialect = csv_module.Sniffer().sniff(text[:1024], delimiters=";,")
    reader = csv_module.DictReader(io.StringIO(text), dialect=dialect)
    return lich_hoc_handler.import_from_csv(db, list(reader))

