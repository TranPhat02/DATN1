"""
Notification router — In-app notifications stored in MongoDB.
Each user gets individual notification records; read status tracked per-user.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from tn.config.database import get_mongo_db
from tn.utils.security import get_current_user
from tn.models.tai_khoan import TaiKhoan

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    username: str
    title: str
    content: str
    sourceName: Optional[str] = None
    maLopMon: Optional[str] = None
    announcementId: Optional[str] = None
    isRead: bool = False
    createdAt: str


@router.get("/", response_model=List[NotificationResponse])
async def get_unread_notifications(user: TaiKhoan = Depends(get_current_user)):
    """Get all unread notifications for the current user."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not ready")

    cursor = db.notifications.find({
        "username": user.UserName,
        "isRead": False,
    }).sort("createdAt", -1).limit(50)

    notifications = await cursor.to_list(length=50)
    for n in notifications:
        n.pop("_id", None)

    return notifications


@router.get("/count")
async def get_unread_count(user: TaiKhoan = Depends(get_current_user)):
    """Get count of unread notifications."""
    db = get_mongo_db()
    if db is None:
        return {"count": 0}

    count = await db.notifications.count_documents({
        "username": user.UserName,
        "isRead": False,
    })
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, user: TaiKhoan = Depends(get_current_user)):
    """Mark a single notification as read."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not ready")

    result = await db.notifications.update_one(
        {"id": notification_id, "username": user.UserName},
        {"$set": {"isRead": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Đã đánh dấu đã đọc"}


@router.put("/read-all")
async def mark_all_as_read(user: TaiKhoan = Depends(get_current_user)):
    """Mark all notifications as read for the current user."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not ready")

    await db.notifications.update_many(
        {"username": user.UserName, "isRead": False},
        {"$set": {"isRead": True}},
    )
    return {"message": "Đã đánh dấu tất cả đã đọc"}
