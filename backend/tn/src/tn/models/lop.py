"""
Lop model (Class) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from tn.config.database import Base


class Lop(Base):
    __tablename__ = "Lop"

    MaLop = Column(String(20), primary_key=True)
    TenLop = Column(String(100), nullable=False)
    MaKhoa = Column(String(20), ForeignKey("KhoaHoc.MaKhoa"), nullable=True)

    # relationships
    sinh_viens = relationship("SinhVien", back_populates="lop")
    lop_mon_hocs = relationship("LopMonHoc", back_populates="lop")
    khoa_hoc = relationship("KhoaHoc", back_populates="lops")

    def __repr__(self):
        return f"<Lop(MaLop='{self.MaLop}', TenLop='{self.TenLop}')>"


# ── Pydantic schemas ──
class LopCreate(BaseModel):
    MaLop: str
    TenLop: str
    MaKhoa: Optional[str] = None


class LopUpdate(BaseModel):
    TenLop: Optional[str] = None
    MaKhoa: Optional[str] = None


class LopResponse(BaseModel):
    MaLop: str
    TenLop: str
    MaKhoa: Optional[str] = None

    class Config:
        from_attributes = True
