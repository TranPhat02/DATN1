"""
Chat handler — Classroom messaging and AI chatbot logic with name resolution.
"""
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

from tn.config.database import get_mongo_db, SessionLocal, settings
from tn.models.sinh_vien import SinhVien
from tn.models.giao_vien import GiaoVien


def _resolve_name(sender: str) -> str:
    """Resolve sender ID to human-readable name by looking up in MySQL."""
    try:
        db = SessionLocal()
        # Try student first
        sv = db.query(SinhVien).filter(SinhVien.MaSV == sender).first()
        if sv:
            db.close()
            return sv.TenSV or sender
        # Try teacher
        gv = db.query(GiaoVien).filter(GiaoVien.MaGV == sender).first()
        if gv:
            db.close()
            return gv.TenGV or sender
        db.close()
    except Exception:
        pass
    return sender


async def get_messages(ma_lop_mon: str, channel: str = "class", username: str = None) -> list:
    """Get chat messages for a classroom, filtered by channel."""
    db = get_mongo_db()
    if db is None:
        return []

    query = {"maLopMon": ma_lop_mon, "channel": channel}
    if channel == "ai" and username:
        query["owner"] = username

    cursor = db.chat_messages.find(query).sort("timestamp", 1)
    messages = []
    async for msg in cursor:
        if "_id" in msg:
            msg["id"] = str(msg.pop("_id"))
        # Resolve sender to name
        msg["senderName"] = _resolve_name(msg.get("sender", ""))
        messages.append(msg)
    return messages


async def send_message(ma_lop_mon: str, sender: str, sender_name: str, content: str) -> dict:
    """Send a message to the classroom chat with resolved sender name."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB không khả dụng")
    
    # Resolve name from database
    resolved_name = _resolve_name(sender)
    
    vn_tz = timezone(timedelta(hours=7))
    message = {
        "maLopMon": ma_lop_mon,
        "sender": sender,
        "senderName": resolved_name,
        "content": content,
        "channel": "class",
        "timestamp": datetime.now(vn_tz).isoformat(),
    }
    result = await db.chat_messages.insert_one(message.copy())
    message["id"] = str(result.inserted_id)
    message.pop("_id", None)
    return message


async def ask_ai(ma_lop_mon: str, sender: str, question: str) -> dict:
    """Ask AI chatbot a question using Gemini, enriched with classroom context
    and document knowledge from TF-IDF search."""
    import google.generativeai as genai
    import os

    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB không khả dụng")

    vn_tz = timezone(timedelta(hours=7))
    
    # Save the user question
    user_msg = {
        "maLopMon": ma_lop_mon,
        "sender": sender,
        "senderName": _resolve_name(sender),
        "content": question,
        "channel": "ai",
        "owner": sender,
        "timestamp": datetime.now(vn_tz).isoformat(),
    }
    await db.chat_messages.insert_one(user_msg.copy())

    # ── Gather classroom context ──
    context_parts = []

    # 1. Recent announcements (up to 20)
    try:
        ann_cursor = db.announcements.find({"maLopMon": ma_lop_mon}).sort("createdAt", -1).limit(20)
        announcements = await ann_cursor.to_list(length=20)
        if announcements:
            ann_texts = []
            for a in announcements:
                created = a.get("createdAt", "")
                content = a.get("content", "")
                author = a.get("senderName", a.get("sender", ""))
                ann_texts.append(f"[{created}] {author}: {content}")
            context_parts.append("THÔNG BÁO GẦN ĐÂY TRONG LỚP:\n" + "\n".join(ann_texts))
    except Exception:
        pass

    # 2. Recent class chat messages (up to 50)
    try:
        chat_cursor = db.chat_messages.find(
            {"maLopMon": ma_lop_mon, "channel": "class"}
        ).sort("timestamp", -1).limit(50)
        chat_msgs = await chat_cursor.to_list(length=50)
        if chat_msgs:
            chat_msgs.reverse()  # chronological order
            chat_texts = []
            for m in chat_msgs:
                ts = m.get("timestamp", "")
                name = m.get("senderName", m.get("sender", ""))
                content = m.get("content", "")
                chat_texts.append(f"[{ts}] {name}: {content}")
            context_parts.append("LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY:\n" + "\n".join(chat_texts))
    except Exception:
        pass

    # 3. Document content (TF-IDF search từ tài liệu lớp)
    try:
        from tn.utils.document_search_service import get_document_context
        doc_context = await get_document_context(ma_lop_mon, question)
        if doc_context:
            context_parts.append("NỘI DUNG TÀI LIỆU LIÊN QUAN:\n" + doc_context)
    except Exception as e:
        print(f"[Chat] Document search error (non-blocking): {e}")

    context_block = "\n\n".join(context_parts) if context_parts else ""

    # Generate AI response
    try:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="Chưa có API key cho Gemini")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        system_prompt = (
            "Bạn là trợ lý giáo dục trong một lớp học trực tuyến. "
            "Hãy trả lời bằng tiếng Việt, thân thiện và hữu ích.\n\n"
            "QUY TẮC:\n"
            "1. ƯU TIÊN trả lời dựa trên NỘI DUNG TÀI LIỆU và NGỮ CẢNH LỚP HỌC được cung cấp bên dưới.\n"
            "2. Được phép suy luận hợp lý từ nội dung tài liệu đã cung cấp để trả lời chi tiết hơn.\n"
            "3. Khi trả lời từ tài liệu, hãy trích dẫn tên file nguồn.\n"
            "4. KHÔNG bịa đặt thông tin không có cơ sở từ ngữ cảnh.\n"
            "5. Nếu câu hỏi HOÀN TOÀN không liên quan đến nội dung lớp học, "
            "hãy từ chối lịch sự và hướng dẫn sinh viên hỏi đúng chủ đề.\n"
            "6. Nếu tài liệu không chứa đủ thông tin, hãy trả lời phần bạn tìm được "
            "và gợi ý sinh viên xem thêm tài liệu cụ thể trên trang Tài liệu."
        )

        full_prompt = f"{system_prompt}\n\n"
        if context_block:
            full_prompt += f"--- NGỮ CẢNH LỚP HỌC VÀ TÀI LIỆU ---\n{context_block}\n--- HẾT NGỮ CẢNH ---\n\n"
        full_prompt += f"Câu hỏi: {question}"

        response = model.generate_content(full_prompt)
        ai_reply = response.text
    except Exception as e:
        ai_reply = f"Xin lỗi, tôi không thể trả lời lúc này. ({str(e)[:100]})"

    ai_msg = {
        "maLopMon": ma_lop_mon,
        "sender": "AI",
        "senderName": "Trợ lý AI",
        "content": ai_reply,
        "channel": "ai",
        "owner": sender,
        "timestamp": datetime.now(vn_tz).isoformat(),
    }
    result = await db.chat_messages.insert_one(ai_msg.copy())
    ai_msg["id"] = str(result.inserted_id)
    ai_msg.pop("_id", None)
    return ai_msg

