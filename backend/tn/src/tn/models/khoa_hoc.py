"""
KhoaHoc model (Course/Cohort) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from tn.config.database import Base


class KhoaHoc(Base):
    __tablename__ = "KhoaHoc"

    MaKhoa = Column(String(20), primary_key=True)
    TenKhoa = Column(String(100), nullable=False)

    # relationships
    sinh_viens = relationship("SinhVien", back_populates="khoa_hoc")
    lops = relationship("Lop", back_populates="khoa_hoc")

    def __repr__(self):
        return f"<KhoaHoc(MaKhoa='{self.MaKhoa}', TenKhoa='{self.TenKhoa}')>"


# ── Pydantic schemas ──
class KhoaHocCreate(BaseModel):
    MaKhoa: str
    TenKhoa: str


class KhoaHocUpdate(BaseModel):
    TenKhoa: Optional[str] = None


class KhoaHocResponse(BaseModel):
    MaKhoa: str
    TenKhoa: str

    class Config:
        from_attributes = True
