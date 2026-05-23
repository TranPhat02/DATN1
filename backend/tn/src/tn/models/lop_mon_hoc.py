"""
LopMonHoc model (Class-Subject) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from tn.config.database import Base


class LopMonHoc(Base):
    __tablename__ = "LopMonHoc"

    MaLopMon = Column(String(20), primary_key=True)
    TenLopMon = Column(Text, nullable=True)  # optional custom name
    MaLop = Column(String(20), ForeignKey("Lop.MaLop"), nullable=True)
    MaMH = Column(String(20), ForeignKey("MonHoc.MaMH"), nullable=True)
    MaGV = Column(String(20), ForeignKey("GiaoVien.MaGV"), nullable=True)
    MaHocKi = Column(String(20), ForeignKey("HocKi.MaHocKi"), nullable=True)
    ChoPhepXemDiem = Column(Boolean, default=False)
    ChoPhepXemQuiz = Column(Boolean, default=False)

    # relationships
    lop = relationship("Lop", back_populates="lop_mon_hocs")
    mon_hoc = relationship("MonHoc", back_populates="lop_mon_hocs")
    giao_vien = relationship("GiaoVien", back_populates="lop_mon_hocs")
    hoc_ki = relationship("HocKi", back_populates="lop_mon_hocs")
    diem_mon_hocs = relationship("DiemMonHoc", back_populates="lop_mon_hoc")
    diem_trac_nghiems = relationship("DiemTracNghiem", back_populates="lop_mon_hoc")
    lich_hocs = relationship("LichHoc", back_populates="lop_mon_hoc")
    sinh_vien_lop_mon_hocs = relationship("SinhVienLopMonHoc", back_populates="lop_mon_hoc")

    def __repr__(self):
        return f"<LopMonHoc(MaLopMon='{self.MaLopMon}')>"


# ── Pydantic schemas ──
class LopMonHocCreate(BaseModel):
    MaLopMon: Optional[str] = None
    TenLopMon: Optional[str] = None
    MaLop: Optional[str] = None
    MaMH: Optional[str] = None
    MaGV: Optional[str] = None
    MaHocKi: Optional[str] = None
    ChoPhepXemDiem: bool = False
    ChoPhepXemQuiz: bool = False


class LopMonHocUpdate(BaseModel):
    TenLopMon: Optional[str] = None
    MaLop: Optional[str] = None
    MaMH: Optional[str] = None
    MaGV: Optional[str] = None
    MaHocKi: Optional[str] = None
    ChoPhepXemDiem: Optional[bool] = None
    ChoPhepXemQuiz: Optional[bool] = None


class LopMonHocResponse(BaseModel):
    MaLopMon: str
    TenLopMon: Optional[str] = None
    MaLop: Optional[str] = None
    MaMH: Optional[str] = None
    MaGV: Optional[str] = None
    MaHocKi: Optional[str] = None
    ChoPhepXemDiem: bool
    ChoPhepXemQuiz: bool
    # Joined fields (populated by handler)
    TenMH: Optional[str] = None
    TenGV: Optional[str] = None
    TenLop: Optional[str] = None
    TenHocKi: Optional[str] = None
    MaNamHoc: Optional[str] = None

    class Config:
        from_attributes = True
