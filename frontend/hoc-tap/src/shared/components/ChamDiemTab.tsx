import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import { quizApi, type QuizPendingSubmission, type Quiz } from '../../api/quizApi';

interface Props {
  maLopMon: string;
}

export default function ChamDiemTab({ maLopMon }: Props) {
  const [submissions, setSubmissions] = useState<QuizPendingSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection
  const [activeSub, setActiveSub] = useState<QuizPendingSubmission | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  
  // Grading state
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quizApi.listPendingSubmissions(maLopMon);
      setSubmissions(data);
    } catch {
      toast.error('Không thể tải danh sách chờ chấm');
    } finally {
      setLoading(false);
    }
  }, [maLopMon]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleSelectSub = async (sub: QuizPendingSubmission) => {
    try {
      toast.loading('Đang tải câu hỏi...', { id: 'load-q' });
      const quiz = await quizApi.getById(sub.quizId);
      setActiveQuiz(quiz);
      setActiveSub(sub);
      
      // Init grade state
      const initialGrades: Record<string, number> = {};
      Object.keys(sub.essayAnswers || {}).forEach(qid => {
        initialGrades[qid] = 0;
      });
      setGrades(initialGrades);
      toast.success('Đã tải câu hỏi', { id: 'load-q' });
    } catch {
      toast.error('Lỗi khi tải quiz', { id: 'load-q' });
    }
  };

  const handleGradeSubmit = async () => {
    if (!activeSub) return;
    try {
      setSubmitting(true);
      const res = await quizApi.gradeSubmission(activeSub.quizId, activeSub.maSV, grades);
      toast.success(`Đã lưu điểm! Điểm tổng kết: ${res.finalScore}`);
      setActiveSub(null);
      setActiveQuiz(null);
      fetchSubmissions(); // Reload list
    } catch {
      toast.error('Có lỗi xảy ra khi chấm điểm');
    } finally {
      setSubmitting(false);
    }
  };

  if (activeSub && activeQuiz) {
    const essayQs = activeQuiz.questions.filter(q => q.type === 'essay');
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Chấm bài: {activeSub.maSV}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{activeQuiz.title}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => setActiveSub(null)}>← Quay lại danh sách</button>
        </div>

        <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--bg-secondary)' }}>
          <h4>Kết quả trắc nghiệm (Máy chấm)</h4>
          <p>Đúng {activeSub.soCauDung} / {activeSub.mcTotal} câu (Điểm quy đổi tạm: {activeSub.score}/10)</p>
        </div>

        {essayQs.map((q, i) => (
          <div key={q.id} className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <h4 style={{ color: 'var(--primary-600)', marginBottom: 'var(--space-2)' }}>Câu {i+1}: {q.question}</h4>
            {q.imageUrl && <img src={q.imageUrl} alt="minh hoạ" style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: 'var(--space-3)' }} />}
            
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
              <strong>Đáp án của SV:</strong>
              <p style={{ marginTop: 'var(--space-2)', whiteSpace: 'pre-wrap' }}>{activeSub.essayAnswers[q.id] || '(Sinh viên bỏ trống)'}</p>
            </div>
            
            {q.sampleAnswer && (
              <div style={{ padding: 'var(--space-3)', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
                <strong style={{ color: 'var(--warning-600)' }}>Đáp án tham khảo:</strong>
                <p style={{ marginTop: 'var(--space-2)', whiteSpace: 'pre-wrap' }}>{q.sampleAnswer}</p>
              </div>
            )}
            
            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <label style={{ margin: 0 }}>Điểm cho câu này (Tối đa {q.maxScore || 10}):</label>
              <input 
                className="input" 
                type="number" 
                min={0} 
                max={q.maxScore || 10} 
                step={0.5}
                style={{ width: '100px' }}
                value={grades[q.id] || ''}
                onChange={e => setGrades({...grades, [q.id]: Number(e.target.value)})}
              />
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
          <button className="btn btn-primary" onClick={handleGradeSubmit} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'Xác nhận chấm điểm'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <HiOutlineCheckCircle style={{ fontSize: '3rem', color: 'var(--success-400)', marginBottom: 'var(--space-3)' }} />
          <h3>Tuyệt vời!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Hiện không có bài làm tự luận nào cần chấm điểm.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Danh sách chờ chấm điểm ({submissions.length})</h3>
          {submissions.map((sub, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-4)' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Sinh viên: {sub.maSV}</h4>
                <p style={{ margin: 'var(--space-1) 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                </p>
                <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  Trắc nghiệm: {sub.soCauDung}/{sub.mcTotal} • Tự luận: {Object.keys(sub.essayAnswers).length} câu
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => handleSelectSub(sub)}>
                Chấm bài
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
