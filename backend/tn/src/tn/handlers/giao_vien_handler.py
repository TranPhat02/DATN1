"""
GiaoVien handler — CRUD business logic.
Auto-generates MaGV. Auto-creates TaiKhoan (username=MaGV), sends email.
"""
from typing import List
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
import threading

from tn.models.giao_vien import GiaoVien, GiaoVienCreate, GiaoVienUpdate
from tn.models.tai_khoan import TaiKhoan
from tn.utils.security import hash_password
from tn.config.database import settings


def _gen_id():
    return "GV" + datetime.now().strftime("%y%m%d%H%M%S%f")[:14]


def _send_account_email(gmail: str, username: str, password: str, ten: str):
    """Send account creation email in background thread."""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_EMAIL
        msg["To"] = gmail
        msg["Subject"] = "Tài khoản TN Education Platform"

        body = f"""
        <h2>Xin chào {ten},</h2>
        <p>Tài khoản giáo viên của bạn trên hệ thống TN Education đã được tạo thành công.</p>
        <table style="border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;">Tên đăng nhập:</td><td style="padding:8px;">{username}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Mật khẩu:</td><td style="padding:8px;">{password}</td></tr>
        </table>
        <p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>
        <p>Trân trọng,<br>TN Education Platform</p>
        """
        msg.attach(MIMEText(body, "html", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, gmail, msg.as_string())
    except Exception as e:
        print(f"[Email Error] Không gửi được email cho {gmail}: {e}")


def get_all(db: Session) -> List[GiaoVien]:
    return db.query(GiaoVien).all()


def get_by_id(db: Session, ma_gv: str) -> GiaoVien:
    obj = db.query(GiaoVien).filter(GiaoVien.MaGV == ma_gv).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"GiaoVien '{ma_gv}' không tìm thấy")
    return obj


def add(db: Session, data: GiaoVienCreate) -> GiaoVien:
    dump = data.model_dump()
    if not dump.get("MaGV"):
        dump["MaGV"] = _gen_id()
    obj = GiaoVien(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # Auto-create TaiKhoan (username = MaGV, password = 123456789)
    existing = db.query(TaiKhoan).filter(TaiKhoan.UserName == obj.MaGV).first()
    if not existing:
        default_pw = "123456789"
        account = TaiKhoan(
            UserName=obj.MaGV,
            Password=hash_password(default_pw),
            Role="teacher",
        )
        db.add(account)
        db.commit()
        # Send email in background if Gmail is set
        gmail = obj.Gmail
        if gmail and settings.SMTP_EMAIL and settings.SMTP_APP_PASSWORD:
            threading.Thread(
                target=_send_account_email,
                args=(gmail, obj.MaGV, default_pw, obj.TenGV),
                daemon=True,
            ).start()

    return obj


def edit(db: Session, ma_gv: str, data: GiaoVienUpdate) -> GiaoVien:
    obj = get_by_id(db, ma_gv)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_gv: str) -> dict:
    obj = get_by_id(db, ma_gv)
    db.delete(obj)
    db.commit()
    return {"message": f"GiaoVien '{ma_gv}' đã xóa thành công"}
