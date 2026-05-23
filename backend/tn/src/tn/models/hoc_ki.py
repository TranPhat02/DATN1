"""
HocKi model (Semester) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from tn.config.database import Base


class HocKi(Base):
    __tablename__ = "HocKi"

    MaHocKi = Column(String(20), primary_key=True)
    TenHocKi = Column(String(50), nullable=False)
    MaNamHoc = Column(String(20), ForeignKey("NamHoc.MaNamHoc"), nullable=True)

    # relationships
    nam_hoc = relationship("NamHoc", back_populates="hoc_kis")
    lop_mon_hocs = relationship("LopMonHoc", back_populates="hoc_ki")

    def __repr__(self):
        return f"<HocKi(MaHocKi='{self.MaHocKi}', TenHocKi='{self.TenHocKi}')>"


# ── Pydantic schemas ──
class HocKiCreate(BaseModel):
    MaHocKi: Optional[str] = None
    TenHocKi: str
    MaNamHoc: Optional[str] = None


class HocKiUpdate(BaseModel):
    TenHocKi: Optional[str] = None
    MaNamHoc: Optional[str] = None


class HocKiResponse(BaseModel):
    MaHocKi: str
    TenHocKi: str
    MaNamHoc: Optional[str] = None

    class Config:
        from_attributes = True
