/**
 * QuizTakeTab — Quiz taking page with timer and tab-switch protection
 * Detects tab switches and records count in submission.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { quizApi, type Quiz, type QuizQuestion, type QuizResult, type MySubmissionInfo } from '../../api/quizApi';
import {
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineCheckBadge,
} from 'react-icons/hi2';
import SubmissionDetailModal from './SubmissionDetailModal';
import { useAuth } from '../contexts/AuthContext';
import './QuizTake.css';

interface QuizTakeTabProps {
  maLopMon: string;
  isTeacher?: boolean;
  onEditQuiz?: (quiz: Quiz) => void;
}

export default function QuizTakeTab({ maLopMon, isTeacher, onEditQuiz }: QuizTakeTabProps) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [quizSearch, setQuizSearch] = useState('');
  const [lockMenuId, setLockMenuId] = useState<string | null>(null);
  const [lockUntilInput, setLockUntilInput] = useState('');
  const [mySubmissions, setMySubmissions] = useState<MySubmissionInfo[]>([]);
  const [reviewingQuizId, setReviewingQuizId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dynamic status evaluation
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Update time every 10 seconds to fresh dynamic locks without full re-fetch
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const checkIsLocked = (quiz: Quiz) => {
    if (quiz.lockType === 1) return true;
    if (quiz.lockType === 2 && quiz.lockUntil) {
      return currentTime > new Date(quiz.lockUntil).getTime();
    }
    return false;
  };

  const handleLockChange = async (quizId: string, lockType: number, lockUntil: string = '') => {
    try {
      await quizApi.updateLock(quizId, lockType, lockUntil);
      toast.success(lockType === 0 ? 'Đã mở khoá' : 'Đã khoá bài trắc nghiệm');
      setLockMenuId(null);
      const data = await quizApi.listByLopMon(maLopMon);
      setQuizzes(data);
    } catch { toast.error('Cập nhật khoá thất bại'); }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài kiểm tra này?")) return;
    try {
      await quizApi.remove(quizId);
      toast.success("Đã xóa bài kiểm tra");
      setQuizzes(q => q.filter(x => x.id !== quizId));
    } catch {
      toast.error("Lỗi khi xóa bài kiểm tra");
    }
  };

  // ── Load quizzes ──
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const [data, subs] = await Promise.all([
          quizApi.listByLopMon(maLopMon),
          !isTeacher ? quizApi.getMySubmissions(maLopMon) : Promise.resolve([]),
        ]);
        setQuizzes(data);
        setMySubmissions(subs);
      } catch {
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [maLopMon]);

  // ── Tab-switch detection ──
  useEffect(() => {
    if (!activeQuiz || submitted || isTeacher) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        setShowWarning(true);
        toast.error('⚠️ Bạn đã chuyển tab! Hành vi này được ghi lại.', { duration: 5000 });
      }
    };

    const handleBlur = () => {
      setTabSwitchCount((prev) => prev + 1);
      setShowWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeQuiz, submitted, isTeacher]);

  // ── Timer & Deadline Check ──
  useEffect(() => {
    if (!activeQuiz || submitted || timeLeft <= 0 || isTeacher) return;

    timerRef.current = setInterval(() => {
      // 1. Check strict time limit (Duration)
      setTimeLeft((prev) => {
        if (prev <= 1) {
          toast.error('Hết thời gian làm bài, hệ thống tự động nộp bài!');
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });

      // 2. Check hard deadline (lockType === 2)
      if (activeQuiz.lockType === 2 && activeQuiz.lockUntil) {
        const deadline = new Date(activeQuiz.lockUntil).getTime();
        if (Date.now() >= deadline) {
           toast.error('Bài kiểm tra đã đến hạn chót, hệ thống tự động nộp bài!');
           handleSubmit();
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeQuiz, submitted, timeLeft, isTeacher]);

  const startQuiz = (quiz: Quiz) => {
    if (checkIsLocked(quiz) && !isTeacher) {
      toast.error('Bài kiểm tra này đã bị khoá hoặc đã hết hạn.');
      return;
    }
    
    let startingQuiz = quiz;
    // Shuffle questions if student
    if (!isTeacher) {
      const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
      startingQuiz = { ...quiz, questions: shuffled };
    }
    setActiveQuiz(startingQuiz);
    setAnswers({});
    setTabSwitchCount(0);
    setSubmitted(false);
    setResult(null);
    setShowWarning(false);
    setTimeLeft(quiz.duration * 60);
  };

  const handleSubmit = useCallback(async () => {
    if (!activeQuiz || submitted) return;
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate time spent: total duration - remaining time
    const totalSeconds = activeQuiz.duration * 60;
    const spent = totalSeconds - timeLeft;

    try {
      const res = await quizApi.submit({
        quizId: activeQuiz.id,
        answers,
        tabSwitchCount,
        timeSpent: spent,
      });
      setResult(res);
      const existingIdx = mySubmissions.findIndex(s => s.quizId === activeQuiz.id);
      if (existingIdx === -1) {
        // Determine if this quiz has essay questions
        const hasEssay = activeQuiz.questions.some(q => q.type === 'essay');
        setMySubmissions([...mySubmissions, { quizId: activeQuiz.id, status: hasEssay ? 'pending' : 'graded' }]);
      }
      toast.success('Đã nộp bài!');
    } catch {
      toast.error('Nộp bài thất bại');
    }
  }, [activeQuiz, answers, tabSwitchCount, submitted, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Quiz List ──
  if (!activeQuiz) {
    if (loading) {
      return <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>;
    }

    return (
      <div className="animate-fade-in">
        {/* Search bar */}
        <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '400px' }}>
            <HiOutlineMagnifyingGlass className="search-icon" />
            <input className="input" placeholder="Tìm kiếm bài trắc nghiệm..." value={quizSearch} onChange={(e) => setQuizSearch(e.target.value)} style={{ paddingLeft: 'var(--space-10)' }} />
          </div>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
            {quizzes.filter(q => q.title.toLowerCase().includes(quizSearch.toLowerCase())).length} bài
          </span>
        </div>

        {quizzes.filter(q => q.title.toLowerCase().includes(quizSearch.toLowerCase())).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>{quizSearch ? 'Không tìm thấy bài trắc nghiệm phù hợp' : 'Chưa có bài trắc nghiệm nào'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {quizzes.filter(q => q.title.toLowerCase().includes(quizSearch.toLowerCase())).map((q) => {
              const dynamicallyLocked = checkIsLocked(q);
              return (
              <div key={q.id} className="card quiz-list-item" onClick={() => !dynamicallyLocked && startQuiz(q)} style={{ opacity: dynamicallyLocked && !isTeacher ? 0.6 : 1, cursor: dynamicallyLocked && !isTeacher ? 'not-allowed' : 'pointer', position: 'relative', zIndex: lockMenuId === q.id ? 50 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{q.title}</h4>
                    {dynamicallyLocked && (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                        🔒 {q.lockType === 1 ? 'Khoá cứng' : `Hết hạn lúc ${q.lockUntil ? new Date(q.lockUntil).toLocaleString('vi-VN') : ''}`}
                      </span>
                    )}
                    {!isTeacher && mySubmissions.some(s => s.quizId === q.id) && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <HiOutlineCheckBadge /> Đã làm
                      </span>
                    )}
                    {!isTeacher && mySubmissions.some(s => s.quizId === q.id && s.status === 'pending') && (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        ⏳ Chờ chấm
                      </span>
                    )}
                    {!dynamicallyLocked && q.lockType === 0 && isTeacher && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>🔓 Mở</span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    {q.questions.length} câu • {q.duration} phút
                    {q.lockType === 2 && q.lockUntil && (
                      <span style={{ marginLeft: 'var(--space-2)', color: 'var(--warning-400)' }}>
                        • Hạn chót: {new Date(q.lockUntil).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </span>
                </div>
                {isTeacher && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    {/* Lock controls */}
                    <div style={{ position: 'relative' }}>
                      <button className={`btn btn-sm ${dynamicallyLocked ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setLockMenuId(lockMenuId === q.id ? null : q.id)}>
                        {dynamicallyLocked ? '🔒' : '🔓'}
                      </button>
                      {lockMenuId === q.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', minWidth: '240px', boxShadow: 'var(--shadow-lg)' }}>
                          <button className="btn btn-success btn-sm" style={{ width: '100%', marginBottom: 'var(--space-2)' }} onClick={() => handleLockChange(q.id, 0)}>
                            🔓 Mở khoá
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ width: '100%', marginBottom: 'var(--space-2)' }} onClick={() => handleLockChange(q.id, 1)}>
                            🔒 Khoá cứng
                          </button>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>Khoá theo thời hạn:</div>
                          <input type="datetime-local" className="input" value={lockUntilInput} onChange={e => setLockUntilInput(e.target.value)} style={{ width: '100%', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }} />
                          <button className="btn btn-warning btn-sm" style={{ width: '100%' }} disabled={!lockUntilInput} onClick={() => handleLockChange(q.id, 2, new Date(lockUntilInput).toISOString())}>
                            ⏰ Khoá đến thời hạn
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-ghost btn-sm action-delete" onClick={() => handleDeleteQuiz(q.id)}>Xóa</button>
                    {onEditQuiz && <button className="btn btn-ghost btn-sm" onClick={() => onEditQuiz(q)}>Sửa</button>}
                    <button className="btn btn-primary btn-sm" onClick={() => startQuiz(q)}>Xem</button>
                  </div>
                )}
                {!isTeacher && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {(() => {
                      const sub = mySubmissions.find(s => s.quizId === q.id);
                      if (sub && sub.status === 'graded') {
                        return (
                          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setReviewingQuizId(q.id); }}>
                            Xem lại
                          </button>
                        );
                      }
                      if (sub && sub.status === 'pending') {
                        return (
                          <button className="btn btn-secondary btn-sm" disabled title="Chờ giáo viên chấm tự luận xong">
                            Chờ chấm
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button className="btn btn-primary btn-sm" disabled={dynamicallyLocked} onClick={() => !dynamicallyLocked && startQuiz(q)}>
                      {dynamicallyLocked ? 'Đã khoá' : (mySubmissions.some(s => s.quizId === q.id) ? 'Làm lại' : 'Bắt đầu')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
        
        {reviewingQuizId && (
          <SubmissionDetailModal quizId={reviewingQuizId} maSV={user?.username || ''} onClose={() => setReviewingQuizId(null)} />
        )}
      </div>
    );
  }

  // ── Result ──
  if (submitted && result) {
    const scorePercent = result.tongSoCau > 0 ? (result.soCauDung / result.tongSoCau) * 100 : 0;
    return (
      <div className="quiz-result animate-fade-in">
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          {scorePercent >= 50 ? (
            <HiOutlineCheckCircle style={{ fontSize: '4rem', color: 'var(--success-400)', marginBottom: 'var(--space-4)' }} />
          ) : (
            <HiOutlineXCircle style={{ fontSize: '4rem', color: 'var(--danger-400)', marginBottom: 'var(--space-4)' }} />
          )}
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            {result.soCauDung}/{result.tongSoCau} câu đúng
          </h2>
          <div className="quiz-result-score" style={{ color: scorePercent >= 50 ? 'var(--success-400)' : 'var(--danger-400)' }}>
            {result.score.toFixed(1)} điểm
          </div>
          {tabSwitchCount > 0 && (
            <div className="quiz-warning-box" style={{ marginTop: 'var(--space-4)' }}>
              <HiOutlineExclamationTriangle /> Số lần chuyển tab: {tabSwitchCount}
            </div>
          )}
          {result.isRetake && (
            <div className="quiz-warning-box" style={{ marginTop: 'var(--space-4)', background: 'var(--warning-100)', color: 'var(--warning-700)' }}>
              <HiOutlineExclamationTriangle /> Đây là lần làm lại. Theo quy định, điểm lượt này sẽ không được cập nhật vào kết quả chính thức.
            </div>
          )}
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => setActiveQuiz(null)}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz Taking ──
  return (
    <div className="quiz-take animate-fade-in">
      {/* Timer + Warning Bar */}
      <div className="quiz-timer-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <HiOutlineClock />
          <span className={`quiz-timer ${timeLeft < 60 ? 'quiz-timer--danger' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {tabSwitchCount > 0 && (
            <span className="quiz-tab-count">
              <HiOutlineExclamationTriangle /> Chuyển tab: {tabSwitchCount}
            </span>
          )}
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {Object.keys(answers).length}/{activeQuiz.questions.length} đã trả lời
          </span>
          {isTeacher ? (
            <button className="btn btn-primary btn-sm" onClick={() => setActiveQuiz(null)}>
              Đóng (Xem)
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
              Nộp bài
            </button>
          )}
        </div>
      </div>

      {/* Warning overlay */}
      {showWarning && (
        <div className="quiz-warning-box" style={{ marginBottom: 'var(--space-4)' }}>
          <HiOutlineExclamationTriangle />
          <span>Cảnh báo: Bạn đã chuyển tab khỏi bài thi. Hành vi này đã được ghi lại ({tabSwitchCount} lần).</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowWarning(false)}>Đóng</button>
        </div>
      )}

      {/* Questions */}
      <div className="quiz-questions">
        {activeQuiz.questions.map((q: QuizQuestion, i: number) => (
          <div key={q.id} className="card quiz-question">
            <div className="quiz-question-number">Câu {i + 1}/{activeQuiz.questions.length}</div>
            <p className="quiz-question-text">{q.question}</p>
            {q.imageUrl && (
              <img src={q.imageUrl} alt="minh hoạ câu hỏi" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }} />
            )}
            {q.type === 'multiple_choice' || !q.type ? (
              <div className="quiz-options">
                {(q.options || []).map((opt: string, j: number) => (
                  <label
                    key={j}
                    className={`quiz-option ${answers[q.id] === j ? 'quiz-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === j}
                      onChange={() => setAnswers({ ...answers, [q.id]: j })}
                    />
                    <span className="quiz-option-letter">{String.fromCharCode(65 + j)}</span>
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="quiz-essay-input" style={{ marginTop: 'var(--space-3)' }}>
                <textarea 
                  className="input" 
                  rows={4} 
                  placeholder={isTeacher ? "(Sinh viên nhập câu trả lời ở đây)" : "Nhập câu trả lời của bạn..."}
                  value={String(answers[q.id] || '')}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  disabled={!!result || isTeacher}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
