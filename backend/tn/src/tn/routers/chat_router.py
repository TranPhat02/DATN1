"""
Chat router — Classroom messaging and AI chatbot endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from tn.config.database import get_db, get_mongo_db
from tn.handlers import chat_handler
from tn.utils.security import get_current_user
from tn.models.tai_khoan import TaiKhoan

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


class SendMessageRequest(BaseModel):
    ma_lop_mon: str
    content: str


class AskAIRequest(BaseModel):
    ma_lop_mon: str
    question: str


@router.get("/{ma_lop_mon}")
async def get_messages(ma_lop_mon: str, channel: str = "class", user: TaiKhoan = Depends(get_current_user)):
    """Get chat messages for a classroom, filtered by channel (class/ai)."""
    return await chat_handler.get_messages(ma_lop_mon, channel=channel, username=user.UserName)


@router.get("/{ma_lop_mon}/count")
async def get_message_count(ma_lop_mon: str, channel: str = "class", _=Depends(get_current_user)):
    """Get number of chat messages for a classroom."""
    db = get_mongo_db()
    if db is None:
        return {"count": 0}
    count = await db.chat_messages.count_documents({"maLopMon": ma_lop_mon, "channel": channel})
    return {"count": count}


@router.post("/send")
async def send_message(req: SendMessageRequest, user: TaiKhoan = Depends(get_current_user)):
    """Send a message to the classroom chat."""
    return await chat_handler.send_message(req.ma_lop_mon, user.UserName, user.UserName, req.content)


@router.post("/ai")
async def ask_ai(req: AskAIRequest, user: TaiKhoan = Depends(get_current_user)):
    """Ask the AI chatbot a question."""
    return await chat_handler.ask_ai(req.ma_lop_mon, user.UserName, req.question)
