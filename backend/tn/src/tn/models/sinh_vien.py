"""
SinhVien model (Student) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from datetime import date
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from tn.config.database import Base


class SinhVien(Base):
    __tablename__ = "SinhVien"

    MaSV = Column(String(20), primary_key=True)
    TenSV = Column(String(100), nullable=False)
    GioiTinh = Column(String(10), nullable=True)
    NgaySinh = Column(Date, nullable=True)
    DiaChi = Column(String(255), nullable=True)
    MaLop = Column(String(20), ForeignKey("Lop.MaLop"), nullable=True)
    Gmail = Column(String(100), nullable=True)
    MaKhoa = Column(String(20), ForeignKey("KhoaHoc.MaKhoa"), nullable=True)

    # relationships
    lop = relationship("Lop", back_populates="sinh_viens")
    khoa_hoc = relationship("KhoaHoc", back_populates="sinh_viens")

    def __repr__(self):
        return f"<SinhVien(MaSV='{self.MaSV}', TenSV='{self.TenSV}')>"


# ── Pydantic schemas ──
class SinhVienCreate(BaseModel):
    MaSV: Optional[str] = None
    TenSV: str
    GioiTinh: Optional[str] = None
    NgaySinh: Optional[date] = None
    DiaChi: Optional[str] = None
    MaLop: Optional[str] = None
    Gmail: Optional[str] = None
    MaKhoa: Optional[str] = None


class SinhVienUpdate(BaseModel):
    TenSV: Optional[str] = None
    GioiTinh: Optional[str] = None
    NgaySinh: Optional[date] = None
    DiaChi: Optional[str] = None
    MaLop: Optional[str] = None
    Gmail: Optional[str] = None
    MaKhoa: Optional[str] = None


class SinhVienResponse(BaseModel):
    MaSV: str
    TenSV: str
    GioiTinh: Optional[str] = None
    NgaySinh: Optional[date] = None
    DiaChi: Optional[str] = None
    MaLop: Optional[str] = None
    Gmail: Optional[str] = None
    MaKhoa: Optional[str] = None

    class Config:
        from_attributes = True
