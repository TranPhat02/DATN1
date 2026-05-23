"""
Email Service — Centralized email sending via Gmail SMTP.
Reusable across the entire application.
"""
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional

from tn.config.database import settings


def send_email_html(to: str, subject: str, html_body: str):
    """Send a single HTML email via Gmail SMTP_SSL."""
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_EMAIL
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to, msg.as_string())
        print(f"[Email OK] Đã gửi email tới {to}")
    except Exception as e:
        print(f"[Email Error] Không gửi được email cho {to}: {e}")


def _build_announcement_html(title: str, content: str, source_name: str, file_url: Optional[str] = None, file_name: Optional[str] = None) -> str:
    """Build a styled HTML email body for announcements."""
    file_section = ""
    if file_url:
        display_name = file_name or "Tệp đính kèm"
        file_section = f"""
        <div style="margin-top:16px; padding:12px 16px; background:#f0f4ff; border-radius:8px; border-left:4px solid #6264a7;">
            <span style="font-size:13px; color:#555;">📎 Tệp đính kèm:</span><br>
            <a href="{file_url}" style="color:#6264a7; font-weight:600; text-decoration:none;">{display_name}</a>
        </div>
        """

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#6264a7,#8b5cf6); padding:24px 28px;">
            <h1 style="color:#fff; margin:0; font-size:20px; font-weight:600;">📢 {source_name}</h1>
            <p style="color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:13px;">TN Education Platform</p>
        </div>
        <div style="padding:24px 28px;">
            <h2 style="color:#1a1a2e; margin:0 0 12px; font-size:18px;">{title}</h2>
            <div style="color:#444; font-size:14px; line-height:1.7; white-space:pre-wrap;">{content}</div>
            {file_section}
        </div>
        <div style="padding:16px 28px; background:#f8f9fa; border-top:1px solid #eee;">
            <p style="color:#999; font-size:12px; margin:0;">Email này được gửi tự động từ hệ thống TN Education Platform. Vui lòng không trả lời email này.</p>
        </div>
    </div>
    """


def send_announcement_emails_background(
    recipients: List[str],
    title: str,
    content: str,
    source_name: str = "Thông báo hệ thống",
    file_url: Optional[str] = None,
    file_name: Optional[str] = None,
):
    """Send announcement emails to multiple recipients in a background thread."""
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        print("[Email] SMTP chưa được cấu hình, bỏ qua gửi email.")
        return
    if not recipients:
        print("[Email] Không có người nhận, bỏ qua.")
        return

    def _send():
        html_body = _build_announcement_html(title, content, source_name, file_url, file_name)
        subject = f"[{source_name}] {title}"
        success = 0
        fail = 0
        for email_addr in recipients:
            if email_addr:
                try:
                    send_email_html(email_addr, subject, html_body)
                    success += 1
                except Exception:
                    fail += 1
        print(f"[Email] Hoàn tất: {success} thành công, {fail} thất bại / {len(recipients)} tổng")

    threading.Thread(target=_send, daemon=True).start()
