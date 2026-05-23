"""
Document Search Service — Tìm kiếm nội dung tài liệu cho chatbot trợ giảng.

Thuật toán: Keyword Extraction + Document Chunking + TF-IDF Ranking + Fallback.

Workflow:
  1. User gửi câu hỏi → bóc tách keywords (loại stopwords tiếng Việt TỐI THIỂU)
  2. Kiểm tra document index trong MongoDB (cache)
     - Nếu chưa có / hết hạn → download files từ Drive → extract text → chunk → lưu MongoDB
  3. TF-IDF ranking: tính điểm từng chunk so với keywords (dùng substring matching)
  4. Trả về top-K chunks + fallback context nếu kết quả ít

Performance:
  - MongoDB cache: index 1 lần, dùng lại nhiều lần (~50ms tra cứu)
  - TTL 24h: tự rebuild khi hết hạn
  - Invalidation: xóa cache khi có upload mới
  - Thuần Python TF-IDF: không cần scikit-learn
"""
import math
import re
import logging
from collections import Counter
from datetime import datetime, timezone, timedelta
from typing import Optional

from tn.config.database import get_mongo_db, settings

logger = logging.getLogger("document_search")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("[DocSearch] %(levelname)s: %(message)s"))
    logger.addHandler(_h)

# ─── Config ───
CHUNK_SIZE = 500        # words per chunk
CHUNK_OVERLAP = 100     # overlap words between chunks
TOP_K = 8               # number of top chunks to return
FALLBACK_CHUNKS = 3     # number of fallback chunks per document when search is weak
INDEX_TTL_HOURS = 24    # cache duration before auto-rebuild
MAX_FILES_TO_INDEX = 20 # max files to index per class (prevent timeout)
MAX_FILE_SIZE_MB = 50   # skip files larger than this

# ─── Vietnamese Stopwords (CHỈ các từ thực sự vô nghĩa) ───
# Giảm tối thiểu — giữ lại các từ có thể là thành phần ghép có nghĩa
VIETNAMESE_STOPWORDS = {
    "là", "và", "của", "các", "có", "với", "này",
    "đã", "để", "một", "từ", "đến", "như", "khi",
    "hay", "hoặc", "cũng", "thì", "mà", "về",
    "ra", "lên", "xuống", "vào", "bao", "nhiêu",
    "nào", "gì", "sao", "tại", "vì", "nếu", "thế",
    "đó", "đây", "ở", "rồi", "lại", "rất", "quá",
    "chỉ", "mới", "đang", "sẽ", "vẫn", "còn",
    "nữa", "hơn", "nhất", "bị", "bởi", "theo",
    "qua", "sau", "trước", "giữa", "trên", "dưới",
    "ngoài", "những", "nhiều", "ít", "mỗi", "tất",
    "cả", "ai", "em", "tôi", "chúng", "ta", "mình",
    "họ", "nó", "hãy", "đi", "nhé", "ạ", "vậy",
    "thôi", "xin", "dạ", "vâng", "ơn",
    "bạn", "nên", "phải", "được", "muốn", "luôn",
    # Tiếng Anh phổ biến
    "the", "is", "are", "was", "were", "be", "been",
    "a", "an", "and", "or", "but", "in", "on", "at",
    "to", "for", "of", "with", "by", "from", "as",
    "it", "this", "that", "what", "how", "why", "when",
}


# ═══════════════════════════════════════════════════════════════
# 1. KEYWORD EXTRACTION
# ═══════════════════════════════════════════════════════════════

def extract_keywords(question: str) -> list[str]:
    """Bóc tách keywords từ câu hỏi.
    Dùng stopwords TỐI THIỂU để giữ lại nhiều từ nhất có thể.
    Trả về unigrams + bigrams + trigrams.
    """
    # Normalize
    text = question.lower().strip()
    text = re.sub(r'[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]', ' ', text)
    text = re.sub(r'\s+', ' ', text)

    words = text.split()

    # Filter: chỉ loại stopwords thực sự vô nghĩa, giữ từ >= 2 ký tự
    meaningful = [w for w in words if w not in VIETNAMESE_STOPWORDS and len(w) >= 2]

    # Generate n-grams cho cụm từ ghép tiếng Việt
    bigrams = []
    trigrams = []
    for i in range(len(meaningful) - 1):
        bigrams.append(f"{meaningful[i]} {meaningful[i + 1]}")
    for i in range(len(meaningful) - 2):
        trigrams.append(f"{meaningful[i]} {meaningful[i + 1]} {meaningful[i + 2]}")

    # Ưu tiên: trigrams (chính xác nhất) > bigrams > unigrams (linh hoạt nhất)
    keywords = trigrams + bigrams + meaningful

    # Fallback: nếu không tìm được keyword, dùng tất cả từ gốc
    return keywords if keywords else words


# ═══════════════════════════════════════════════════════════════
# 2. TEXT CHUNKING
# ═══════════════════════════════════════════════════════════════

def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Chia text thành các chunks overlap ~chunk_size từ.
    Overlap giúp không mất ngữ cảnh ở ranh giới chunk.
    """
    words = text.split()
    if not words:
        return []
    if len(words) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end >= len(words):
            break
        start += chunk_size - overlap  # slide window

    return chunks


# ═══════════════════════════════════════════════════════════════
# 3. TF-IDF RANKING (dùng substring matching)
# ═══════════════════════════════════════════════════════════════

def _compute_tfidf_scores(
    keywords: list[str],
    chunks: list[dict],
) -> list[tuple[dict, float]]:
    """Tính TF-IDF score cho mỗi chunk so với keywords.
    TẤT CẢ keywords đều dùng substring matching (không exact word).
    Trả về list (chunk, score) sắp xếp giảm dần.
    """
    if not chunks or not keywords:
        return []

    N = len(chunks)

    # Precompute IDF cho mỗi keyword (dùng substring matching)
    idf = {}
    for kw in keywords:
        kw_lower = kw.lower()
        df = sum(1 for c in chunks if kw_lower in c["content"].lower())
        idf[kw] = math.log((N + 1) / (1 + df)) + 1  # smoothed IDF

    # Score mỗi chunk
    scored = []
    for chunk in chunks:
        content_lower = chunk["content"].lower()
        total_words = len(content_lower.split()) or 1

        score = 0.0
        for kw in keywords:
            kw_lower = kw.lower()
            # LUÔN dùng substring matching — phù hợp tiếng Việt
            tf = content_lower.count(kw_lower)
            if tf > 0:
                tf_normalized = tf / total_words
                score += tf_normalized * idf.get(kw, 1.0)

        scored.append((chunk, score))

    # Sắp xếp giảm dần theo score
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


# ═══════════════════════════════════════════════════════════════
# 4. DOCUMENT INDEXING (MongoDB cache)
# ═══════════════════════════════════════════════════════════════

async def build_document_index(ma_lop_mon: str) -> int:
    """Download tài liệu từ Drive → extract text → chunk → lưu MongoDB.
    Trả về số chunks đã tạo.
    """
    # Lazy imports tránh circular dependency
    from tn.handlers.drive_handler import list_files_by_lop_mon, get_content_for_quiz_ai
    from tn.handlers.quiz_handler import _extract_text_from_file

    db = get_mongo_db()
    if db is None:
        logger.error("MongoDB không khả dụng")
        return 0

    logger.info(f"[{ma_lop_mon}] Building document index...")

    # Lấy danh sách file tài liệu của lớp
    try:
        files = list_files_by_lop_mon(ma_lop_mon)
    except Exception as e:
        logger.error(f"[{ma_lop_mon}] Không lấy được danh sách file: {e}")
        return 0

    if not files:
        logger.info(f"[{ma_lop_mon}] Không có file tài liệu")
        return 0

    # Phân loại: files vs folders
    doc_files = []
    folder_ids = []
    for f in files:
        if f.get("mimeType") == "application/vnd.google-apps.folder":
            folder_ids.append(f)
        else:
            # Bỏ qua file quá lớn
            size_bytes = int(f.get("size", 0) or 0)
            if size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
                logger.warning(f"[{ma_lop_mon}] Bỏ qua file quá lớn: {f.get('name')} ({size_bytes / 1024 / 1024:.1f}MB)")
                continue
            doc_files.append(f)

    logger.info(f"[{ma_lop_mon}] Found {len(doc_files)} files + {len(folder_ids)} folders")

    # Giới hạn số file để tránh timeout
    all_items_to_process = doc_files[:MAX_FILES_TO_INDEX]
    # Cũng thêm các folder (sẽ download files bên trong)
    for folder in folder_ids[:5]:  # tối đa 5 folders
        all_items_to_process.append(folder)

    all_chunks = []
    vn_tz = timezone(timedelta(hours=7))
    now = datetime.now(vn_tz).isoformat()

    for f in all_items_to_process:
        file_id = f.get("id")
        file_name = f.get("name", "unknown")

        try:
            # Download file content (hỗ trợ cả file lẻ và folder)
            files_data = get_content_for_quiz_ai(file_id)
            for f_data in files_data:
                actual_name = f_data.get("name", file_name)
                text = _extract_text_from_file(f_data)

                if not text or len(text.strip()) < 50:
                    continue

                # Clean text
                text = re.sub(r'\n{3,}', '\n\n', text)
                text = re.sub(r'[ \t]+', ' ', text)

                # Chunk text
                chunks = _chunk_text(text)
                logger.info(f"[{ma_lop_mon}] '{actual_name}': {len(chunks)} chunks")

                for idx, chunk_content in enumerate(chunks):
                    all_chunks.append({
                        "maLopMon": ma_lop_mon,
                        "fileId": file_id,
                        "fileName": actual_name,
                        "chunkIndex": idx,
                        "content": chunk_content,
                        "updatedAt": now,
                    })
        except Exception as e:
            logger.warning(f"[{ma_lop_mon}] Error processing '{file_name}': {e}")
            continue

    if not all_chunks:
        logger.info(f"[{ma_lop_mon}] No chunks generated")
        # Vẫn lưu meta để tránh rebuild liên tục khi lớp không có tài liệu text
        await db.document_index_meta.update_one(
            {"maLopMon": ma_lop_mon},
            {"$set": {"maLopMon": ma_lop_mon, "chunkCount": 0, "updatedAt": now}},
            upsert=True,
        )
        return 0

    # Xóa index cũ
    await db.document_chunks.delete_many({"maLopMon": ma_lop_mon})

    # Lưu chunks mới
    await db.document_chunks.insert_many(all_chunks)

    # Lưu metadata cho cache tracking
    await db.document_index_meta.update_one(
        {"maLopMon": ma_lop_mon},
        {"$set": {"maLopMon": ma_lop_mon, "chunkCount": len(all_chunks), "updatedAt": now}},
        upsert=True,
    )

    logger.info(f"[{ma_lop_mon}] ✅ Document index: {len(all_chunks)} chunks from {len(all_items_to_process)} items")
    return len(all_chunks)


async def _ensure_index(ma_lop_mon: str) -> bool:
    """Đảm bảo document index tồn tại và còn hạn.
    Tự build nếu chưa có hoặc hết hạn. Trả về True nếu index sẵn sàng.
    """
    db = get_mongo_db()
    if db is None:
        return False

    # Kiểm tra cache
    meta = await db.document_index_meta.find_one({"maLopMon": ma_lop_mon})

    if meta:
        updated_at = meta.get("updatedAt", "")
        if updated_at:
            try:
                vn_tz = timezone(timedelta(hours=7))
                last_update = datetime.fromisoformat(updated_at)
                if last_update.tzinfo is None:
                    last_update = last_update.replace(tzinfo=vn_tz)
                now = datetime.now(vn_tz)
                age_hours = (now - last_update).total_seconds() / 3600
                if age_hours < INDEX_TTL_HOURS:
                    chunk_count = meta.get("chunkCount", 0)
                    logger.info(f"[{ma_lop_mon}] Index cache HIT ({chunk_count} chunks, age: {age_hours:.1f}h)")
                    return chunk_count > 0
                else:
                    logger.info(f"[{ma_lop_mon}] Index expired (age: {age_hours:.1f}h), rebuilding...")
            except Exception:
                pass

    # Build index
    count = await build_document_index(ma_lop_mon)
    return count > 0


# ═══════════════════════════════════════════════════════════════
# 5. SEARCH API (với fallback context)
# ═══════════════════════════════════════════════════════════════

async def search_relevant_chunks(
    ma_lop_mon: str,
    keywords: list[str],
    top_k: int = TOP_K,
) -> list[dict]:
    """Tìm kiếm chunks liên quan nhất bằng TF-IDF ranking.
    Nếu TF-IDF không tìm đủ kết quả → thêm fallback chunks (đầu mỗi tài liệu).
    LUÔN trả về ít nhất vài chunks nếu tài liệu tồn tại.
    """
    db = get_mongo_db()
    if db is None:
        return []

    # Đảm bảo index đã build
    has_index = await _ensure_index(ma_lop_mon)
    if not has_index:
        return []

    # Load tất cả chunks của lớp từ MongoDB
    cursor = db.document_chunks.find(
        {"maLopMon": ma_lop_mon},
        {"_id": 0, "content": 1, "fileName": 1, "chunkIndex": 1, "fileId": 1},
    )
    chunks = await cursor.to_list(length=None)

    if not chunks:
        return []

    logger.info(f"[{ma_lop_mon}] Searching {len(chunks)} chunks with {len(keywords)} keywords")

    # TF-IDF scoring
    scored = _compute_tfidf_scores(keywords, chunks)

    # Lấy chunks có score > 0
    relevant = [(chunk, score) for chunk, score in scored if score > 0]
    top_chunks = [chunk for chunk, score in relevant[:top_k]]

    if top_chunks:
        logger.info(f"[{ma_lop_mon}] ✅ TF-IDF found {len(top_chunks)} relevant chunks (top: {relevant[0][1]:.4f})")

    # ── FALLBACK: nếu TF-IDF tìm ít kết quả, thêm đầu mỗi tài liệu ──
    if len(top_chunks) < FALLBACK_CHUNKS:
        logger.info(f"[{ma_lop_mon}] TF-IDF chỉ tìm {len(top_chunks)} chunks → thêm fallback")
        used_keys = {(c.get("fileId", ""), c.get("chunkIndex", -1)) for c in top_chunks}

        # Lấy chunk đầu tiên từ mỗi file (tổng quan nội dung)
        seen_files = set()
        for chunk in chunks:
            fid = chunk.get("fileId", "")
            cidx = chunk.get("chunkIndex", 0)
            key = (fid, cidx)
            if fid not in seen_files and key not in used_keys and cidx <= 1:
                top_chunks.append(chunk)
                seen_files.add(fid)
                if len(top_chunks) >= top_k:
                    break

        logger.info(f"[{ma_lop_mon}] Sau fallback: {len(top_chunks)} chunks tổng cộng")

    return top_chunks


async def get_document_context(ma_lop_mon: str, question: str) -> str:
    """Entry point chính — lấy nội dung tài liệu liên quan cho câu hỏi chatbot.
    LUÔN trả về context nếu lớp có tài liệu (dùng fallback nếu cần).
    """
    # Bóc tách keywords
    keywords = extract_keywords(question)
    if not keywords:
        return ""

    logger.info(f"[{ma_lop_mon}] Keywords: {keywords[:10]}")

    # Tìm chunks liên quan
    chunks = await search_relevant_chunks(ma_lop_mon, keywords)

    if not chunks:
        return ""

    # Format context cho AI
    context_parts = []

    for chunk in chunks:
        file_name = chunk.get("fileName", "Không rõ")
        chunk_idx = chunk.get("chunkIndex", 0)
        content = chunk.get("content", "")

        context_parts.append(f"[Tài liệu: {file_name}, đoạn {chunk_idx + 1}]\n{content}")

    return "\n\n".join(context_parts)


# ═══════════════════════════════════════════════════════════════
# 6. CACHE INVALIDATION
# ═══════════════════════════════════════════════════════════════

async def invalidate_document_index(ma_lop_mon: str):
    """Xóa document index cache (async version).
    Gọi khi có upload file mới.
    """
    db = get_mongo_db()
    if db is None:
        return
    await db.document_chunks.delete_many({"maLopMon": ma_lop_mon})
    await db.document_index_meta.delete_one({"maLopMon": ma_lop_mon})
    logger.info(f"[{ma_lop_mon}] 🗑️ Document index invalidated")


def invalidate_document_index_sync(ma_lop_mon: str):
    """Xóa document index cache (sync version).
    Dùng trong drive_handler (sync functions) khi upload file.
    Sử dụng pymongo trực tiếp thay vì motor.
    """
    from pymongo import MongoClient
    try:
        client = MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=3000)
        db = client[settings.MONGO_DB_NAME]
        db.document_chunks.delete_many({"maLopMon": ma_lop_mon})
        db.document_index_meta.delete_one({"maLopMon": ma_lop_mon})
        client.close()
        logger.info(f"[{ma_lop_mon}] 🗑️ Document index invalidated (sync)")
    except Exception as e:
        logger.warning(f"[{ma_lop_mon}] Failed to invalidate index: {e}")
