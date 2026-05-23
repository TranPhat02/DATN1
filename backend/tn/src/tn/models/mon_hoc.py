"""
MonHoc model (Subject) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from tn.config.database import Base


class MonHoc(Base):
    __tablename__ = "MonHoc"

    MaMH = Column(String(20), primary_key=True)
    TenMH = Column(String(100), nullable=False)
    SoTinChi = Column(Integer, nullable=False, default=0)

    # relationships
    lop_mon_hocs = relationship("LopMonHoc", back_populates="mon_hoc")

    def __repr__(self):
        return f"<MonHoc(MaMH='{self.MaMH}', TenMH='{self.TenMH}')>"


# ── Pydantic schemas ──
class MonHocCreate(BaseModel):
    MaMH: Optional[str] = None
    TenMH: str
    SoTinChi: int = 0


class MonHocUpdate(BaseModel):
    TenMH: Optional[str] = None
    SoTinChi: Optional[int] = None


class MonHocResponse(BaseModel):
    MaMH: str
    TenMH: str
    SoTinChi: int

    class Config:
        from_attributes = True
