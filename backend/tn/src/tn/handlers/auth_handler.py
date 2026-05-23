"""
Auth handler — login business logic.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from tn.models.tai_khoan import TaiKhoan
from tn.utils.security import verify_password, create_access_token


def login(db: Session, login_data: OAuth2PasswordRequestForm) -> dict:
    """Verify credentials and return a JWT token."""
    user = db.query(TaiKhoan).filter(TaiKhoan.UserName == login_data.username).first()
    
    vs = verify_password(login_data.password, user.Password) if user else False
    if not user or not vs:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
        )
    access_token = create_access_token(data={"sub": user.UserName, "role": user.Role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.Role,
        "username": user.UserName,
    }
