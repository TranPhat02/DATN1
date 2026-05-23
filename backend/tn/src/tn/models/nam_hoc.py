"""
NamHoc model (Academic Year) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from tn.config.database import Base


class NamHoc(Base):
    __tablename__ = "NamHoc"

    MaNamHoc = Column(String(20), primary_key=True)
    NamHoc = Column(String(50), nullable=False)

    # relationships
    hoc_kis = relationship("HocKi", back_populates="nam_hoc")

    def __repr__(self):
        return f"<NamHoc(MaNamHoc='{self.MaNamHoc}', NamHoc='{self.NamHoc}')>"


# ── Pydantic schemas ──
class NamHocCreate(BaseModel):
    MaNamHoc: Optional[str] = None
    NamHoc: str


class NamHocUpdate(BaseModel):
    NamHoc: Optional[str] = None


class NamHocResponse(BaseModel):
    MaNamHoc: str
    NamHoc: str

    class Config:
        from_attributes = True
