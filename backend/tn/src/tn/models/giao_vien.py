"""
GiaoVien model (Teacher) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from datetime import date
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Date
from sqlalchemy.orm import relationship
from tn.config.database import Base


class GiaoVien(Base):
    __tablename__ = "GiaoVien"

    MaGV = Column(String(20), primary_key=True)
    TenGV = Column(String(100), nullable=False)
    GioiTinh = Column(String(10), nullable=True)
    NgaySinh = Column(Date, nullable=True)
    DiaChi = Column(String(255), nullable=True)
    Gmail = Column(String(100), nullable=True)

    # relationships
    lop_mon_hocs = relationship("LopMonHoc", back_populates="giao_vien")

    def __repr__(self):
        return f"<GiaoVien(MaGV='{self.MaGV}', TenGV='{self.TenGV}')>"


# ── Pydantic schemas ──
class GiaoVienCreate(BaseModel):
    MaGV: Optional[str] = None
    TenGV: str
    GioiTinh: Optional[str] = None
    NgaySinh: Optional[date] = None
    DiaChi: Optional[str] = None
    Gmail: Optional[str] = None


class GiaoVienUpdate(BaseModel):
    TenGV: Optional[str] = None
    GioiTinh: Optional[str] = None
    NgaySinh: Optional[date] = None
    DiaChi: Optional[str] = None
    Gmail: Optional[str] = None


class GiaoVienResponse(BaseModel):
    MaGV: str
    TenGV: str
    GioiTinh: Optional[str] = None
    NgaySinh: Optional[date] = None
    DiaChi: Optional[str] = None
    Gmail: Optional[str] = None

    class Config:
        from_attributes = True
