"""
TaiKhoan model (Accounts) — MySQL / SQLAlchemy + Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String
from tn.config.database import Base


class TaiKhoan(Base):
    __tablename__ = "TaiKhoan"

    UserName = Column(String(100), primary_key=True)
    Password = Column(String(255), nullable=False)
    Role = Column(String(50), nullable=False, default="student")

    def __repr__(self):
        return f"<TaiKhoan(UserName='{self.UserName}', Role='{self.Role}')>"


# ── Pydantic schemas ──
class TaiKhoanCreate(BaseModel):
    UserName: str
    Password: str
    Role: str = "student"


class TaiKhoanUpdate(BaseModel):
    Password: Optional[str] = None
    Role: Optional[str] = None


class TaiKhoanResponse(BaseModel):
    UserName: str
    Role: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    UserName: str
    Password: str
