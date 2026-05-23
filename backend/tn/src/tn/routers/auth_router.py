"""
Auth router — login, change password, profile endpoints.
"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import auth_handler
from tn.utils.security import get_current_user, verify_password, hash_password
from tn.models.tai_khoan import TaiKhoan
from fastapi import HTTPException

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
def login(login_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """POST /api/v1/auth/login — Đăng nhập."""
    return auth_handler.login(db, login_data)


@router.get("/profile")
def get_profile(user: TaiKhoan = Depends(get_current_user), db: Session = Depends(get_db)):
    """GET /api/v1/auth/profile — Lấy thông tin profile.
    Username = MaSV or MaGV (not Gmail).
    """
    from tn.models.sinh_vien import SinhVien
    from tn.models.giao_vien import GiaoVien

    profile = {
        "username": user.UserName,
        "role": user.Role,
    }

    if user.Role == "student":
        # Username is MaSV
        sv = db.query(SinhVien).filter(SinhVien.MaSV == user.UserName).first()
        if sv:
            profile.update({
                "maSV": sv.MaSV,
                "ten": sv.TenSV,
                "gioiTinh": sv.GioiTinh,
                "ngaySinh": str(sv.NgaySinh) if sv.NgaySinh else None,
                "diaChi": sv.DiaChi,
                "maLop": sv.MaLop,
                "gmail": sv.Gmail,
            })
    elif user.Role == "teacher":
        # Username is MaGV
        gv = db.query(GiaoVien).filter(GiaoVien.MaGV == user.UserName).first()
        if gv:
            profile.update({
                "maGV": gv.MaGV,
                "ten": gv.TenGV,
                "gioiTinh": gv.GioiTinh,
                "ngaySinh": str(gv.NgaySinh) if gv.NgaySinh else None,
                "diaChi": gv.DiaChi,
                "gmail": gv.Gmail,
            })
    else:
        profile["ten"] = "Quản trị viên"

    return profile


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /api/v1/auth/change-password — Đổi mật khẩu."""
    if not verify_password(req.old_password, user.Password):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")

    user.Password = hash_password(req.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}
