"""
Thong Ke router — REST API endpoints for Dashboard statistics.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.utils.security import get_current_user

from tn.models.sinh_vien import SinhVien
from tn.models.giao_vien import GiaoVien
from tn.models.mon_hoc import MonHoc
from tn.models.lop import Lop

router = APIRouter(prefix="/api/v1/thong-ke", tags=["ThongKe"])

@router.get("/")
def get_thong_ke(db: Session = Depends(get_db), _=Depends(get_current_user)):
    sv_count = db.query(SinhVien).count()
    gv_count = db.query(GiaoVien).count()
    mh_count = db.query(MonHoc).count()
    lop_count = db.query(Lop).count()
    
    return {
        "sinh_vien": sv_count,
        "giao_vien": gv_count,
        "mon_hoc": mh_count,
        "lop_hoc": lop_count
    }
