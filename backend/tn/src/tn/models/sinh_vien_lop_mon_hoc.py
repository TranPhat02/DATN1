"""
SinhVien_LopMonHoc model (Student-ClassSubject junction) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from tn.config.database import Base


class SinhVienLopMonHoc(Base):
    __tablename__ = "SinhVien_LopMonHoc"

    MaSV = Column(String(20), ForeignKey("SinhVien.MaSV"), primary_key=True)
    MaLopMon = Column(String(20), ForeignKey("LopMonHoc.MaLopMon"), primary_key=True)
    TongKet = Column(String(20), nullable=True)
    HocGhep = Column(Boolean, default=False)

    # relationships
    sinh_vien = relationship("SinhVien")
    lop_mon_hoc = relationship("LopMonHoc", back_populates="sinh_vien_lop_mon_hocs")

    def __repr__(self):
        return f"<SinhVienLopMonHoc(MaSV='{self.MaSV}', MaLopMon='{self.MaLopMon}')>"


# ── Pydantic schemas ──
class SinhVienLopMonHocCreate(BaseModel):
    MaSV: str
    MaLopMon: str
    TongKet: Optional[str] = None
    HocGhep: Optional[bool] = None



class SinhVienLopMonHocUpdate(BaseModel):
    TongKet: Optional[str] = None
    HocGhep: Optional[bool] = None


class SinhVienLopMonHocResponse(BaseModel):
    MaSV: str
    MaLopMon: str
    TongKet: Optional[str] = None
    HocGhep: bool
    TenSV: Optional[str] = None  # joined from SinhVien

    class Config:
        from_attributes = True
