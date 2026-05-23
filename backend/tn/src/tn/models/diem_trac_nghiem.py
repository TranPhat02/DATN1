"""
DiemTracNghiem model (Quiz Grade) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from tn.config.database import Base


class DiemTracNghiem(Base):
    __tablename__ = "DiemTracNghiem"

    MaTN = Column(String(50), primary_key=True)
    MaSV = Column(String(20), ForeignKey("SinhVien.MaSV"), nullable=True)
    MaLopMon = Column(String(20), ForeignKey("LopMonHoc.MaLopMon"), nullable=True)
    SoCauDung = Column(Integer, nullable=True)
    TongSoCau = Column(Integer, nullable=True)
    FileID = Column(String(255), nullable=True)
    ThoiGianLam = Column(Integer, nullable=True)  # seconds spent on quiz
    ThoiGianNop = Column(DateTime, nullable=True)  # submission timestamp (UTC+7)
    SoLanViPham = Column(Integer, nullable=True, default=0) # Number of tab switches

    # relationships
    sinh_vien = relationship("SinhVien")
    lop_mon_hoc = relationship("LopMonHoc", back_populates="diem_trac_nghiems")

    def __repr__(self):
        return f"<DiemTracNghiem(MaTN='{self.MaTN}')>"


# ── Pydantic schemas ──
class DiemTracNghiemCreate(BaseModel):
    MaTN: Optional[str] = None
    MaSV: Optional[str] = None
    MaLopMon: Optional[str] = None
    SoCauDung: Optional[int] = None
    TongSoCau: Optional[int] = None
    FileID: Optional[str] = None
    ThoiGianLam: Optional[int] = None
    SoLanViPham: Optional[int] = 0


class DiemTracNghiemUpdate(BaseModel):
    MaSV: Optional[str] = None
    MaLopMon: Optional[str] = None
    SoCauDung: Optional[int] = None
    TongSoCau: Optional[int] = None
    FileID: Optional[str] = None
    ThoiGianLam: Optional[int] = None
    SoLanViPham: Optional[int] = None


class DiemTracNghiemResponse(BaseModel):
    MaTN: str
    MaSV: Optional[str] = None
    MaLopMon: Optional[str] = None
    SoCauDung: Optional[int] = None
    TongSoCau: Optional[int] = None
    FileID: Optional[str] = None
    ThoiGianLam: Optional[int] = None
    ThoiGianNop: Optional[datetime] = None
    SoLanViPham: Optional[int] = None
    # Joined fields
    TenSV: Optional[str] = None
    TenKhoa: Optional[str] = None
    TenLop: Optional[str] = None
    TenMH: Optional[str] = None

    class Config:
        from_attributes = True
