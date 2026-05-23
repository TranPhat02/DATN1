"""
DiemMonHoc model (Subject Grade) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from tn.config.database import Base


class DiemMonHoc(Base):
    __tablename__ = "DiemMonHoc"

    MaDiem = Column(String(20), primary_key=True)
    MaSV = Column(String(20), ForeignKey("SinhVien.MaSV"), nullable=True)
    MaLopMon = Column(String(20), ForeignKey("LopMonHoc.MaLopMon"), nullable=True)
    DiemGK = Column(Float, nullable=True)
    DiemCK = Column(Float, nullable=True)
    DiemTK = Column(Float, nullable=True)
    DiemH4 = Column(Float, nullable=True)
    DiemChu = Column(String(5), nullable=True)
    GhiChu = Column(String(500), nullable=True)

    # relationships
    sinh_vien = relationship("SinhVien")
    lop_mon_hoc = relationship("LopMonHoc", back_populates="diem_mon_hocs")

    def __repr__(self):
        return f"<DiemMonHoc(MaDiem='{self.MaDiem}')>"


# ── Pydantic schemas ──
class DiemMonHocCreate(BaseModel):
    MaDiem: Optional[str] = None
    MaSV: Optional[str] = None
    MaLopMon: Optional[str] = None
    DiemGK: Optional[float] = None
    DiemCK: Optional[float] = None
    GhiChu: Optional[str] = None


class DiemMonHocUpdate(BaseModel):
    MaSV: Optional[str] = None
    MaLopMon: Optional[str] = None
    DiemGK: Optional[float] = None
    DiemCK: Optional[float] = None
    GhiChu: Optional[str] = None


class DiemMonHocResponse(BaseModel):
    MaDiem: str
    MaSV: Optional[str] = None
    MaLopMon: Optional[str] = None
    DiemGK: Optional[float] = None
    DiemCK: Optional[float] = None
    DiemTK: Optional[float] = None
    DiemH4: Optional[float] = None
    DiemChu: Optional[str] = None
    GhiChu: Optional[str] = None
    TenMH: Optional[str] = None # Added for Admin View
    TenSV: Optional[str] = None
    TenKhoa: Optional[str] = None
    TenLop: Optional[str] = None

    class Config:
        from_attributes = True
