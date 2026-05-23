"""
Announcement router — REST API for class & system announcements.
Stores in MongoDB. Sends email + creates in-app notifications on create.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Any, Union
from pydantic import BaseModel
from datetime import datetime
import uuid

from sqlalchemy.orm import Session
from tn.config.database import get_mongo_db, get_db
from tn.utils.security import get_current_user
from tn.utils.email_service import send_announcement_emails_background
from tn.models.tai_khoan import TaiKhoan
from tn.models.sinh_vien import SinhVien
from tn.models.giao_vien import GiaoVien
from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
from tn.models.lop_mon_hoc import LopMonHoc
from tn.models.mon_hoc import MonHoc

router = APIRouter(prefix="/api/v1/announcements", tags=["Announcements"])


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    fileId: Optional[str] = None
    fileName: Optional[str] = None
    fileUrl: Optional[str] = None
    maKhoa: Optional[List[str]] = None   # list of MaKhoa (multiple courses)
    recipientType: Optional[str] = "all"  # "all" | "students" | "teachers" | "khoa" | "custom"
    # Targeted recipients (optional — for system announcements)
    targetStudents: Optional[List[str]] = None   # list of MaSV
    targetTeachers: Optional[List[str]] = None   # list of MaGV


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class AnnouncementResponse(BaseModel):
    id: str
    maLopMon: str
    title: str
    content: str
    author: str
    createdAt: str
    fileId: Optional[str] = None
    fileName: Optional[str] = None
    fileUrl: Optional[str] = None
    maKhoa: Optional[Union[str, List[str]]] = None


# ── Helper: get recipient emails & usernames ──

def _get_class_recipients(db: Session, ma_lop_mon: str):
    """Get students enrolled in a specific class."""
    enrollments = (
        db.query(SinhVienLopMonHoc)
        .filter(SinhVienLopMonHoc.MaLopMon == ma_lop_mon)
        .all()
    )
    ma_sv_list = [e.MaSV for e in enrollments]
    if not ma_sv_list:
        return [], []

    students = db.query(SinhVien).filter(SinhVien.MaSV.in_(ma_sv_list)).all()
    emails = [s.Gmail for s in students if s.Gmail]
    usernames = [s.MaSV for s in students]
    return emails, usernames


def _get_global_recipients(
    db: Session,
    recipient_type: str,
    ma_khoa: Optional[List[str]],
    target_students: Optional[List[str]],
    target_teachers: Optional[List[str]],
):
    """Get recipients for system announcements based on recipient_type."""
    emails = []
    usernames = []

    # Custom: specific students/teachers
    if recipient_type == "custom":
        if target_students:
            students = db.query(SinhVien).filter(SinhVien.MaSV.in_(target_students)).all()
            emails.extend([s.Gmail for s in students if s.Gmail])
            usernames.extend([s.MaSV for s in students])
        if target_teachers:
            teachers = db.query(GiaoVien).filter(GiaoVien.MaGV.in_(target_teachers)).all()
            emails.extend([t.Gmail for t in teachers if t.Gmail])
            usernames.extend([t.MaGV for t in teachers])
        return emails, usernames

    # By courses
    if recipient_type == "khoa" and ma_khoa and len(ma_khoa) > 0:
        students = db.query(SinhVien).filter(SinhVien.MaKhoa.in_(ma_khoa)).all()
        emails = [s.Gmail for s in students if s.Gmail]
        usernames = [s.MaSV for s in students]
        return emails, usernames

    # Students only
    if recipient_type == "students":
        students = db.query(SinhVien).all()
        emails = [s.Gmail for s in students if s.Gmail]
        usernames = [s.MaSV for s in students]
        return emails, usernames

    # Teachers only
    if recipient_type == "teachers":
        teachers = db.query(GiaoVien).all()
        emails = [t.Gmail for t in teachers if t.Gmail]
        usernames = [t.MaGV for t in teachers]
        return emails, usernames

    # Default: all students + all teachers
    students = db.query(SinhVien).all()
    emails = [s.Gmail for s in students if s.Gmail]
    usernames = [s.MaSV for s in students]

    teachers = db.query(GiaoVien).all()
    emails.extend([t.Gmail for t in teachers if t.Gmail])
    usernames.extend([t.MaGV for t in teachers])

    return emails, usernames


async def _create_notifications(db_mongo, usernames: List[str], announcement: dict, source_name: str):
    """Create per-user notification records in MongoDB."""
    if not usernames:
        return

    notifications = []
    now = datetime.now().isoformat()
    for username in usernames:
        notifications.append({
            "id": str(uuid.uuid4())[:8],
            "username": username,
            "title": announcement["title"],
            "content": announcement["content"][:200],  # truncate for preview
            "maLopMon": announcement["maLopMon"],
            "sourceName": source_name,
            "announcementId": announcement["id"],
            "isRead": False,
            "createdAt": now,
        })

    if notifications:
        await db_mongo.notifications.insert_many(notifications)
        print(f"[Notification] Đã tạo {len(notifications)} thông báo in-app")


# ── Endpoints ──

@router.get("/{ma_lop_mon}", response_model=List[AnnouncementResponse])
async def get_announcements(
    ma_lop_mon: str,
    user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=500, detail="Database not ready")

    cursor = mongo.announcements.find({"maLopMon": ma_lop_mon}).sort("createdAt", -1)
    announcements = await cursor.to_list(length=100)

    # Nếu là thông báo hệ thống toàn cục, lọc theo đối tượng nhận
    if ma_lop_mon == "global" and user.Role != "admin":
        filtered_announcements = []
        student_info = None
        if user.Role == "student":
            student_info = db.query(SinhVien).filter(SinhVien.MaSV == user.UserName).first()

        for a in announcements:
            recipient_type = a.get("recipientType", "all")
            
            # 1. Gửi tới tất cả
            if recipient_type == "all":
                filtered_announcements.append(a)
                continue
                
            # 2. Gửi tới sinh viên
            if recipient_type == "students":
                if user.Role == "student":
                    filtered_announcements.append(a)
                continue
                
            # 3. Gửi tới giáo viên
            if recipient_type == "teachers":
                if user.Role == "teacher":
                    filtered_announcements.append(a)
                continue
                
            # 4. Gửi theo khoa/khoá học
            if recipient_type == "khoa":
                ma_khoa_list = a.get("maKhoa")
                if ma_khoa_list and user.Role == "student" and student_info:
                    if isinstance(ma_khoa_list, list):
                        if student_info.MaKhoa in ma_khoa_list:
                            filtered_announcements.append(a)
                    elif isinstance(ma_khoa_list, str):
                        if student_info.MaKhoa == ma_khoa_list:
                            filtered_announcements.append(a)
                continue
                
            # 5. Gửi tới các đối tượng cụ thể (custom)
            if recipient_type == "custom":
                target_students = a.get("targetStudents", [])
                target_teachers = a.get("targetTeachers", [])
                
                if user.Role == "student":
                    if isinstance(target_students, list) and user.UserName in target_students:
                        filtered_announcements.append(a)
                elif user.Role == "teacher":
                    if isinstance(target_teachers, list) and user.UserName in target_teachers:
                        filtered_announcements.append(a)
                continue

            # Mặc định an toàn: hiển thị nếu không nhận diện được loại đối tượng
            filtered_announcements.append(a)
            
        announcements = filtered_announcements

    for a in announcements:
        a.pop('_id', None)

    return announcements


@router.get("/{ma_lop_mon}/count")
async def get_announcement_count(ma_lop_mon: str, _ = Depends(get_current_user)):
    db = get_mongo_db()
    if db is None:
        return {"count": 0}
    count = await db.announcements.count_documents({"maLopMon": ma_lop_mon})
    return {"count": count}


@router.post("/{ma_lop_mon}", response_model=AnnouncementResponse)
async def create_announcement(
    ma_lop_mon: str,
    req: AnnouncementCreate,
    user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mongo = get_mongo_db()

    announcement = {
        "id": str(uuid.uuid4())[:8],
        "maLopMon": ma_lop_mon,
        "title": req.title,
        "content": req.content,
        "author": user.UserName,
        "createdAt": datetime.now().isoformat(),
        "fileId": req.fileId,
        "fileName": req.fileName,
        "fileUrl": req.fileUrl,
        "maKhoa": req.maKhoa,
        "recipientType": req.recipientType,
        "targetStudents": req.targetStudents,
        "targetTeachers": req.targetTeachers,
    }

    await mongo.announcements.insert_one(announcement.copy())
    announcement.pop("_id", None)

    # ── Determine recipients & sourceName ──
    source_name = "Thông báo hệ thống"
    if ma_lop_mon == "global":
        emails, usernames = _get_global_recipients(db, req.recipientType or "all", req.maKhoa, req.targetStudents, req.targetTeachers)
    else:
        emails, usernames = _get_class_recipients(db, ma_lop_mon)
        
        # Try to get a friendly class name
        lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == ma_lop_mon).first()
        if lmh:
            if lmh.TenLopMon:
                source_name = f"Lớp {lmh.TenLopMon}"
            elif lmh.mon_hoc and lmh.mon_hoc.TenMH:
                source_name = f"Lớp {lmh.mon_hoc.TenMH} ({ma_lop_mon})"
            else:
                source_name = f"Lớp {ma_lop_mon}"
        else:
            source_name = f"Lớp {ma_lop_mon}"

    # ── Create in-app notifications ──
    await _create_notifications(mongo, usernames, announcement, source_name)

    # ── Send emails in background ──
    send_announcement_emails_background(
        recipients=emails,
        title=req.title,
        content=req.content,
        source_name=source_name,
        file_url=req.fileUrl,
        file_name=req.fileName,
    )

    return announcement


@router.put("/{ma_lop_mon}/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    ma_lop_mon: str,
    announcement_id: str,
    req: AnnouncementUpdate,
    user: TaiKhoan = Depends(get_current_user),
):
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=500, detail="Database not ready")

    update_fields = {}
    if req.title is not None:
        update_fields["title"] = req.title
    if req.content is not None:
        update_fields["content"] = req.content

    if not update_fields:
        raise HTTPException(status_code=400, detail="Không có dữ liệu để cập nhật")

    result = await mongo.announcements.update_one(
        {"id": announcement_id, "maLopMon": ma_lop_mon},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Thông báo không tìm thấy")

    # Fetch updated document
    updated = await mongo.announcements.find_one({"id": announcement_id, "maLopMon": ma_lop_mon})
    if updated:
        updated.pop("_id", None)
    return updated


@router.delete("/{ma_lop_mon}/{announcement_id}")
async def delete_announcement(
    ma_lop_mon: str,
    announcement_id: str,
    user: TaiKhoan = Depends(get_current_user),
):
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=500, detail="Database not ready")

    result = await mongo.announcements.delete_one(
        {"id": announcement_id, "maLopMon": ma_lop_mon}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Thông báo không tìm thấy")

    # Also remove related notifications
    await mongo.notifications.delete_many({"announcementId": announcement_id})

    return {"message": "Đã xoá thông báo"}
