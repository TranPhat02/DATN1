"""
Memory handler — Document memory system for AI quiz generation.

Stores per-document summaries (content.md) and question pools (quiz.md)
under: Drive root / memory / {ma_lop_mon} / {file_name} /

Strategy:
  - First access: read 100% of file → summarize → save content.md
  - Subsequent: use 70% cached questions + generate 30% fresh questions
    from a chunk of the original file, then update quiz.md pool.
"""
import json
import random
import re
import traceback
import logging
from typing import Optional

import google.generativeai as genai

from tn.config.database import settings
from tn.handlers.drive_handler import (
    read_memory_file,
    write_memory_file,
)

logger = logging.getLogger("memory_handler")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("[MEMORY] %(levelname)s: %(message)s"))
    logger.addHandler(_h)

# Max questions to keep in the quiz.md pool (prevent unbounded growth)
MAX_POOL_SIZE = 100


def _configure_gemini():
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY chưa được cấu hình")
    genai.configure(api_key=api_key)


def _parse_questions_json(text: str) -> list:
    """Robustly extract JSON array from Gemini response text."""
    text = text.strip()
    if "```" in text:
        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Không tìm thấy JSON hợp lệ trong phản hồi. Preview: {text[:300]}")


def _strip_option_prefix(text: str) -> str:
    cleaned = re.sub(r"^\s*[A-Da-d][.)\-:]\s*", "", text)
    return cleaned.strip() if cleaned.strip() else text.strip()


def _questions_to_markdown(questions: list) -> str:
    """Serialize list of question dicts to markdown string for storage."""
    return json.dumps(questions, ensure_ascii=False, indent=2)


def _questions_from_markdown(md_text: str) -> list:
    """Deserialize questions from stored markdown/json string."""
    try:
        return json.loads(md_text)
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def build_or_refresh_content_summary(
    ma_lop_mon: str,
    file_name: str,
    full_text: str,
    force_rebuild: bool = False,
) -> str:
    """Return content summary for a document.

    - If content.md already exists and force_rebuild=False → return cached summary.
    - Otherwise → call Gemini to summarize, save content.md, return summary.
    """
    if not force_rebuild:
        cached = read_memory_file(ma_lop_mon, file_name, "content")
        if cached:
            logger.info(f"[{file_name}] content.md cache HIT")
            return cached

    logger.info(f"[{file_name}] content.md cache MISS — generating summary ...")
    _configure_gemini()
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Truncate for summary (we only need a representative portion for summary)
    summary_text = full_text[:400_000] if len(full_text) > 400_000 else full_text

    prompt = f"""Bạn là giảng viên đại học. Đọc tài liệu sau và tóm tắt TOÀN BỘ nội dung kiến thức chính.

YÊU CẦU:
- Tóm tắt các khái niệm, lý thuyết, công thức, định nghĩa quan trọng
- Giữ đầy đủ thông tin cốt lõi để có thể tạo câu hỏi sau này
- Viết bằng tiếng Việt, súc tích nhưng không bỏ sót nội dung quan trọng
- Sử dụng định dạng Markdown với các heading để phân chia chủ đề

TÀI LIỆU:
{summary_text}"""

    try:
        response = model.generate_content(prompt)
        summary = response.text.strip()
    except Exception as e:
        logger.error(f"[{file_name}] Gemini summarize failed: {e}")
        # Fallback: store truncated raw text as summary
        summary = full_text[:20_000]

    try:
        write_memory_file(ma_lop_mon, file_name, "content", summary)
        logger.info(f"[{file_name}] content.md saved ({len(summary)} chars)")
    except Exception as e:
        logger.warning(f"[{file_name}] Failed to write content.md: {e}")

    return summary


def generate_quiz_with_memory(
    ma_lop_mon: str,
    file_name: str,
    full_text: str,
    num_questions: int = 10,
) -> list[dict]:
    """Generate quiz questions using the 70/30 memory strategy.

    1. Load existing quiz pool (quiz.md).
    2. If pool has enough questions:
       - Pick 70% (N*0.7) randomly from pool — these are the "memory" questions.
       - Read content summary + a 30% chunk of raw text.
       - Ask Gemini to generate 30% (N*0.3) NEW questions.
       - Merge, dedup, update pool, save quiz.md.
    3. If pool is empty / too small (first run):
       - Generate ALL questions from full_text.
       - Save pool to quiz.md.
    4. Return the final blended list.
    """
    _configure_gemini()
    model = genai.GenerativeModel("gemini-2.5-flash")

    # ── Load existing pool ──
    quiz_md = read_memory_file(ma_lop_mon, file_name, "quiz")
    existing_pool: list[dict] = _questions_from_markdown(quiz_md) if quiz_md else []
    has_memory = len(existing_pool) >= max(1, num_questions // 2)

    logger.info(
        f"[{file_name}] pool={len(existing_pool)} questions, has_memory={has_memory}, requested={num_questions}"
    )

    # ── Also load content summary ──
    content_summary = read_memory_file(ma_lop_mon, file_name, "content") or ""

    if has_memory:
        # ─── MEMORY PATH: 70% old + 30% new ───
        n_from_memory = max(1, round(num_questions * 0.7))
        n_new = num_questions - n_from_memory

        # Pick n_from_memory questions randomly
        memory_questions = random.sample(existing_pool, min(n_from_memory, len(existing_pool)))
        logger.info(f"[{file_name}] Using {len(memory_questions)} cached questions")

        # Pick a 30% chunk from the middle/end of the document (new content)
        chunk_text = _extract_chunk(full_text, fraction=0.30)

        new_questions = _call_gemini_for_questions(
            model=model,
            file_name=file_name,
            num_questions=n_new,
            document_text=chunk_text,
            content_summary=content_summary,
            existing_questions_hint=memory_questions,
        )
        logger.info(f"[{file_name}] Generated {len(new_questions)} new questions")

        # Merge and dedup pool
        all_for_pool = _merge_and_dedup(existing_pool, new_questions)
        # Keep pool bounded
        if len(all_for_pool) > MAX_POOL_SIZE:
            all_for_pool = all_for_pool[-MAX_POOL_SIZE:]

        # Final result = memory_questions + new_questions (padded/trimmed to num_questions)
        final_questions = memory_questions + new_questions
        # Edge case: ensure we have exactly num_questions
        if len(final_questions) < num_questions:
            # Grab extras from pool
            used_ids = {q.get("question", "") for q in final_questions}
            extras = [q for q in all_for_pool if q.get("question", "") not in used_ids]
            final_questions += extras[:num_questions - len(final_questions)]
        final_questions = final_questions[:num_questions]

    else:
        # ─── FIRST RUN: generate ALL from full text ───
        logger.info(f"[{file_name}] First run — generating all {num_questions} questions from full text")

        # Compress text
        text_input = re.sub(r"\n{3,}", "\n\n", full_text)
        text_input = re.sub(r"[ \t]+", " ", text_input)
        if len(text_input) > 800_000:
            text_input = text_input[:800_000]

        new_questions = _call_gemini_for_questions(
            model=model,
            file_name=file_name,
            num_questions=num_questions,
            document_text=text_input,
            content_summary="",
            existing_questions_hint=[],
        )

        all_for_pool = new_questions
        final_questions = new_questions[:num_questions]

    # ── Save updated pool ──
    try:
        write_memory_file(
            ma_lop_mon, file_name, "quiz",
            _questions_to_markdown(all_for_pool),
        )
        logger.info(f"[{file_name}] quiz.md updated — pool now has {len(all_for_pool)} questions")
    except Exception as e:
        logger.warning(f"[{file_name}] Failed to save quiz.md: {e}")

    return final_questions


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _extract_chunk(full_text: str, fraction: float = 0.30) -> str:
    """Extract a fraction-sized chunk from the middle/varied part of the text."""
    total = len(full_text)
    chunk_size = max(5_000, int(total * fraction))
    if total <= chunk_size:
        return full_text
    # Start from 35% into the document (skips intro, picks substantive content)
    start = int(total * 0.35)
    end = min(start + chunk_size, total)
    return full_text[start:end]


def _call_gemini_for_questions(
    model,
    file_name: str,
    num_questions: int,
    document_text: str,
    content_summary: str,
    existing_questions_hint: list[dict],
) -> list[dict]:
    """Call Gemini to generate `num_questions` questions from document_text."""
    if num_questions <= 0:
        return []

    # Build hint block to avoid duplicates
    hint_block = ""
    if existing_questions_hint:
        existing_q_texts = [q.get("question", "") for q in existing_questions_hint[:20]]
        hint_block = (
            "\nDƯỚI ĐÂY LÀ CÁC CÂU HỎI ĐÃ CÓ (KHÔNG ĐƯỢC TẠO LẠI CÂU TƯƠNG TỰ):\n"
            + "\n".join(f"- {q}" for q in existing_q_texts)
            + "\n"
        )

    summary_block = ""
    if content_summary:
        summary_block = (
            f"\nTÓM TẮT KIẾN THỨC TÀI LIỆU (để hiểu ngữ cảnh):\n{content_summary[:3000]}\n"
        )

    prompt = f"""Bạn là giảng viên đại học. Dựa trên NỘI DUNG TÀI LIỆU bên dưới, hãy tạo {num_questions} câu hỏi trắc nghiệm chất lượng cao.
{summary_block}{hint_block}
YÊU CẦU:
- Câu hỏi phải về KIẾN THỨC, KHÁI NIỆM, LÝ THUYẾT trong tài liệu
- KHÔNG hỏi về định dạng file, cấu trúc tài liệu, hay metadata
- Mỗi câu có 4 lựa chọn, chỉ có 1 đáp án đúng
- Các đáp án sai phải hợp lý (không quá hiển nhiên sai)
- Câu hỏi phải rõ ràng, dễ hiểu, bằng tiếng Việt
- QUAN TRỌNG: Trong mảng "options", chỉ ghi NỘI DUNG đáp án, KHÔNG thêm "A.", "B.", "C.", "D."

Trả lời theo format JSON chính xác:
[
  {{
    "question": "Nội dung câu hỏi?",
    "options": ["Đáp án thứ nhất", "Đáp án thứ hai", "Đáp án thứ ba", "Đáp án thứ tư"],
    "correctAnswer": 0,
    "explanation": "Giải thích chi tiết tại sao đáp án này là đúng."
  }}
]
Trong đó correctAnswer là index (0-3) của đáp án đúng.
Chỉ trả về JSON array, không có text thêm.

NỘI DUNG TÀI LIỆU:
{document_text}"""

    try:
        config = genai.GenerationConfig(response_mime_type="application/json")
        response = model.generate_content(prompt, generation_config=config)
        try:
            text = response.text.strip()
        except ValueError as e:
            raise ValueError(f"Gemini safety block: {e}")

        questions = _parse_questions_json(text)

        # Strip A./B./C./D. prefixes from options
        for q in questions:
            if "options" in q and isinstance(q["options"], list):
                q["options"] = [_strip_option_prefix(opt) for opt in q["options"]]

        logger.info(f"[{file_name}] Gemini returned {len(questions)} questions")
        return questions

    except Exception as e:
        logger.error(f"[{file_name}] _call_gemini_for_questions failed: {e}\n{traceback.format_exc()}")
        return []


def _merge_and_dedup(existing: list[dict], new_qs: list[dict]) -> list[dict]:
    """Merge question lists, removing duplicates based on question text similarity."""
    seen: set[str] = set()
    merged = []

    def _normalize(text: str) -> str:
        return re.sub(r"\s+", " ", text.strip().lower())

    for q in existing + new_qs:
        key = _normalize(q.get("question", ""))
        if key and key not in seen:
            seen.add(key)
            merged.append(q)

    return merged
