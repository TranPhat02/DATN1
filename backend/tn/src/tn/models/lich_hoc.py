"""
LichHoc model (Schedule) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from datetime import date
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from tn.config.database import Base


class LichHoc(Base):
    __tablename__ = "LichHoc"

    MaLich = Column(String(20), primary_key=True)
    MaLopMon = Column(String(20), ForeignKey("LopMonHoc.MaLopMon"), nullable=True)
    NgayBatDau = Column(Date, nullable=True)
    NgayKetThuc = Column(Date, nullable=True)
    Thu = Column(String(20), nullable=True)
    PhongHoc = Column(String(50), nullable=True)
    Ca = Column(String(20), nullable=True)

    # relationships
    lop_mon_hoc = relationship("LopMonHoc", back_populates="lich_hocs")

    def __repr__(self):
        return f"<LichHoc(MaLich='{self.MaLich}')>"


# ── Pydantic schemas ──
class LichHocCreate(BaseModel):
    MaLich: Optional[str] = None
    MaLopMon: Optional[str] = None
    NgayBatDau: Optional[date] = None
    NgayKetThuc: Optional[date] = None
    Thu: Optional[str] = None
    PhongHoc: Optional[str] = None
    Ca: Optional[str] = None


class LichHocUpdate(BaseModel):
    MaLopMon: Optional[str] = None
    NgayBatDau: Optional[date] = None
    NgayKetThuc: Optional[date] = None
    Thu: Optional[str] = None
    PhongHoc: Optional[str] = None
    Ca: Optional[str] = None


class LichHocResponse(BaseModel):
    MaLich: str
    MaLopMon: Optional[str] = None
    NgayBatDau: Optional[date] = None
    NgayKetThuc: Optional[date] = None
    Thu: Optional[str] = None
    PhongHoc: Optional[str] = None
    Ca: Optional[str] = None

    class Config:
        from_attributes = True
