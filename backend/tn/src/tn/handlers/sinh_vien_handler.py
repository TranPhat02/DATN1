"""
SinhVien handler — CRUD business logic.
Auto-generates MaSV. Auto-creates TaiKhoan (username=MaSV), sends email.
Auto-enrolls student into all LopMonHoc that share the same MaLop.
"""
from typing import List
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
import threading

from tn.models.sinh_vien import SinhVien, SinhVienCreate, SinhVienUpdate
from tn.models.tai_khoan import TaiKhoan
from tn.models.lop_mon_hoc import LopMonHoc
from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
from tn.models.diem_mon_hoc import DiemMonHoc
from tn.utils.security import hash_password
from tn.config.database import settings


def _gen_id():
    return "SV" + datetime.now().strftime("%y%m%d%H%M%S%f")[:14]


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
        <p>Tài khoản của bạn trên hệ thống TN Education đã được tạo thành công.</p>
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


def get_all(db: Session) -> List[SinhVien]:
    return db.query(SinhVien).all()


def get_by_id(db: Session, ma_sv: str) -> SinhVien:
    obj = db.query(SinhVien).filter(SinhVien.MaSV == ma_sv).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"SinhVien '{ma_sv}' không tìm thấy")
    return obj


def add(db: Session, data: SinhVienCreate) -> SinhVien:
    dump = data.model_dump()
    if not dump.get("MaSV"):
        dump["MaSV"] = _gen_id()
    obj = SinhVien(**dump)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # Auto-create TaiKhoan (username = MaSV, password = 123456789)
    existing = db.query(TaiKhoan).filter(TaiKhoan.UserName == obj.MaSV).first()
    if not existing:
        default_pw = "123456789"
        account = TaiKhoan(
            UserName=obj.MaSV,
            Password=hash_password(default_pw),
            Role="student",
        )
        db.add(account)
        db.commit()
        # Send email in background if Gmail is set
        gmail = obj.Gmail
        if gmail and settings.SMTP_EMAIL and settings.SMTP_APP_PASSWORD:
            threading.Thread(
                target=_send_account_email,
                args=(gmail, obj.MaSV, default_pw, obj.TenSV),
                daemon=True,
            ).start()

    # Auto-enroll student into all LopMonHoc that share the same MaLop
    # and auto-create DiemMonHoc for each enrollment
    if obj.MaLop:
        import time
        lop_mon_hoc_list = (
            db.query(LopMonHoc)
            .filter(LopMonHoc.MaLop == obj.MaLop)
            .all()
        )
        for idx, lmh in enumerate(lop_mon_hoc_list):
            already_enrolled = (
                db.query(SinhVienLopMonHoc)
                .filter(
                    SinhVienLopMonHoc.MaSV == obj.MaSV,
                    SinhVienLopMonHoc.MaLopMon == lmh.MaLopMon,
                )
                .first()
            )
            if not already_enrolled:
                enrollment = SinhVienLopMonHoc(
                    MaSV=obj.MaSV,
                    MaLopMon=lmh.MaLopMon,
                    TongKet=None,
                    HocGhep=False,
                )
                db.add(enrollment)

            # Auto-create empty DiemMonHoc if not exists
            existing_diem = (
                db.query(DiemMonHoc)
                .filter(
                    DiemMonHoc.MaSV == obj.MaSV,
                    DiemMonHoc.MaLopMon == lmh.MaLopMon,
                )
                .first()
            )
            if not existing_diem:
                new_diem = DiemMonHoc(
                    MaDiem=f"D{int(time.time() * 1000) % 100000000}{idx:02d}",
                    MaSV=obj.MaSV,
                    MaLopMon=lmh.MaLopMon,
                )
                db.add(new_diem)

        db.commit()
        print(f"[SinhVien] Đã đăng ký {obj.MaSV} vào {len(lop_mon_hoc_list)} lớp môn học, khởi tạo điểm môn học tương ứng")

    return obj


def edit(db: Session, ma_sv: str, data: SinhVienUpdate) -> SinhVien:
    obj = get_by_id(db, ma_sv)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def remove(db: Session, ma_sv: str) -> dict:
    obj = get_by_id(db, ma_sv)
    db.delete(obj)
    db.commit()
    return {"message": f"SinhVien '{ma_sv}' đã xóa thành công"}
