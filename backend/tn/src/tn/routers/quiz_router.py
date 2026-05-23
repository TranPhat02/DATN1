"""
Quiz router — Quiz generation (AI + manual), listing, taking, and grading endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import quiz_handler
from tn.utils.security import get_current_user
from tn.models.tai_khoan import TaiKhoan

router = APIRouter(prefix="/api/v1/quiz", tags=["Quiz"])


class QuizGenerateRequest(BaseModel):
    file_id: str
    ma_lop_mon: str
    num_questions: int = 10


class ManualQuestionItem(BaseModel):
    id: Optional[str] = None
    type: str = "multiple_choice"  # "multiple_choice" or "essay"
    question: str
    imageUrl: Optional[str] = None
    options: Optional[List[str]] = None
    correctAnswer: Optional[int] = None
    explanation: Optional[str] = None
    sampleAnswer: Optional[str] = None
    maxScore: Optional[float] = 10.0


class ManualQuizCreateRequest(BaseModel):
    ma_lop_mon: str
    title: str = ""
    duration: int = 30
    questions: List[ManualQuestionItem]
    lockType: int = 1  # default=1 (hard lock) — teacher must manually unlock to publish
    lockUntil: str = ""  # ISO datetime for timed lock


class QuizEditRequest(BaseModel):
    ma_lop_mon: str
    title: str = ""
    duration: int = 30
    questions: List[ManualQuestionItem]
    lockType: int = 0
    lockUntil: str = ""


class QuizSubmitRequest(BaseModel):
    quizId: str
    answers: dict  # {questionId: selectedOptionIndex or essay text}
    tabSwitchCount: int = 0
    timeSpent: int = 0  # seconds spent on quiz


class QuizGradeRequest(BaseModel):
    quizId: str
    maSV: str
    essayGrades: dict  # {questionId: score}


@router.post("/generate")
async def generate_quiz(req: QuizGenerateRequest, user: TaiKhoan = Depends(get_current_user)):
    """Generate a quiz from a Drive file using Gemini AI."""
    return await quiz_handler.generate_quiz(req.file_id, req.ma_lop_mon, req.num_questions, ma_gv=user.UserName)


@router.post("/manual")
async def create_manual_quiz(req: ManualQuizCreateRequest, user: TaiKhoan = Depends(get_current_user)):
    """Create a manual quiz with multiple choice and/or essay questions."""
    questions = [q.model_dump() for q in req.questions]
    return await quiz_handler.create_manual_quiz(req.ma_lop_mon, req.title, req.duration, questions, ma_gv=user.UserName, lock_type=req.lockType, lock_until=req.lockUntil)


@router.get("/list/{ma_lop_mon}")
async def list_quizzes(ma_lop_mon: str, _=Depends(get_current_user)):
    """List quizzes for a class."""
    return await quiz_handler.list_quizzes_by_lop_mon(ma_lop_mon)


@router.put("/{quiz_id}")
async def edit_quiz(quiz_id: str, req: QuizEditRequest, user: TaiKhoan = Depends(get_current_user)):
    """Edit an existing quiz."""
    questions = [q.model_dump() for q in req.questions]
    return await quiz_handler.edit_quiz(quiz_id, req.ma_lop_mon, req.title, req.duration, questions, ma_gv=user.UserName, lock_type=req.lockType, lock_until=req.lockUntil)


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str, _=Depends(get_current_user)):
    """Get a quiz (answers hidden for students)."""
    return await quiz_handler.get_quiz_by_id(quiz_id)


@router.post("/submit")
async def submit_quiz(req: QuizSubmitRequest, user: TaiKhoan = Depends(get_current_user)):
    """Submit quiz answers and receive score."""
    return await quiz_handler.submit_quiz(req.quizId, user.UserName, req.answers, req.tabSwitchCount, req.timeSpent)


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str, _=Depends(get_current_user)):
    """Delete a quiz."""
    return await quiz_handler.delete_quiz(quiz_id)


@router.get("/submissions/pending/{ma_lop_mon}")
async def get_pending_submissions(ma_lop_mon: str, _=Depends(get_current_user)):
    """List pending essay submissions for a class."""
    return await quiz_handler.list_pending_submissions(ma_lop_mon)


@router.post("/grade")
async def grade_submission(req: QuizGradeRequest, _=Depends(get_current_user)):
    """Grade an essay submission and finalize score."""
    return await quiz_handler.grade_submission(req.quizId, req.maSV, req.essayGrades)


@router.get("/submission/{quiz_id}/{ma_sv}")
async def get_submission_detail(quiz_id: str, ma_sv: str, user: TaiKhoan = Depends(get_current_user)):
    """Get full details of a submission. Students can only view their own."""
    return await quiz_handler.get_submission_detail(quiz_id, ma_sv, user.UserName, user.Role)


@router.get("/submissions/{ma_lop_mon}")
async def get_all_submissions(ma_lop_mon: str, _=Depends(get_current_user)):
    """List all submissions for a class (teacher view)."""
    return await quiz_handler.list_all_submissions(ma_lop_mon)


@router.get("/my-submissions/{ma_lop_mon}")
async def get_my_submissions(ma_lop_mon: str, user: TaiKhoan = Depends(get_current_user)):
    """List quiz submissions with status for the current student."""
    return await quiz_handler.get_my_submissions(ma_lop_mon, user.UserName)


class QuizLockRequest(BaseModel):
    lockType: int = 0  # 0=open, 1=hard lock, 2=timed lock
    lockUntil: str = ""  # ISO datetime for timed lock


@router.put("/{quiz_id}/lock")
async def lock_quiz(quiz_id: str, req: QuizLockRequest, _=Depends(get_current_user)):
    """Update lock settings for a quiz."""
    return await quiz_handler.update_quiz_lock(quiz_id, req.lockType, req.lockUntil)


@router.get("/grouped-submissions/{ma_lop_mon}")
async def get_grouped_submissions(ma_lop_mon: str, _=Depends(get_current_user)):
    """Get all submissions for a class grouped by quiz, with quiz title and TenMH.
    Used by teacher to view quiz score board organized by quiz name.
    """
    return await quiz_handler.list_submissions_grouped_by_quiz(ma_lop_mon)
