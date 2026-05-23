import { useEffect, useState } from 'react';
import { HiOutlineXMark, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { quizApi, type SubmissionDetail } from '../../api/quizApi';
import './SubmissionDetail.css';

interface Props {
  quizId: string;
  maSV: string;
  onClose: () => void;
}

export default function SubmissionDetailModal({ quizId, maSV, onClose }: Props) {
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        const detail = await quizApi.getSubmissionDetail(quizId, maSV);
        setData(detail);
      } catch {
        toast.error('Không thể tải chi tiết bài làm');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [quizId, maSV, onClose]);

  if (loading) {
    return (
      <div className="submission-modal-overlay">
        <div className="loading-overlay" style={{ position: 'relative', width: 200, height: 200, background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { submission, quiz } = data;

  const formatTime = (secs: number) => {
    return `${Math.floor(secs / 60)}p ${secs % 60}s`;
  };

  return (
    <div className="submission-modal-overlay" onClick={onClose}>
      <div className="submission-modal-content" onClick={e => e.stopPropagation()}>
        <div className="submission-modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Chi tiết bài làm: {maSV}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{quiz.title}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <HiOutlineXMark style={{ fontSize: '1.5rem' }} />
          </button>
        </div>

        <div className="submission-modal-body">
          <div className="submission-stat-box">
            <div className="submission-stat-item">
              <span>Tổng điểm</span>
              <strong style={{ color: submission.score >= 5 ? 'var(--success-500)' : 'var(--danger-500)' }}>
                {submission.finalScore !== undefined ? submission.finalScore : submission.score}
              </strong>
            </div>
            <div className="submission-stat-item">
              <span>Trắc nghiệm đúng</span>
              <strong>{submission.soCauDung} / {submission.mcTotal}</strong>
            </div>
            <div className="submission-stat-item">
              <span>Thời gian làm</span>
              <strong>{formatTime(submission.timeSpent || 0)}</strong>
            </div>
            <div className="submission-stat-item">
              <span>Chuyển tab</span>
              <strong style={{ color: submission.tabSwitchCount > 0 ? 'var(--danger-500)' : 'inherit' }}>
                {submission.tabSwitchCount} lần
              </strong>
            </div>
          </div>

          <div className="submission-questions">
            {quiz.questions.map((q, i) => {
              const isMC = q.type === 'multiple_choice' || !q.type;
              
              if (isMC) {
                const studentAns = submission.answers?.[q.id] as number | undefined;
                const correctAns = q.correctAnswer;

                return (
                  <div key={q.id} className="submission-question">
                    <h4>Câu {i + 1}: {q.question}</h4>
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="minh họa" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', margin: 'var(--space-3) 0', borderRadius: 'var(--radius-md)' }} />
                    )}
                    
                    <div className="submission-options" style={{ marginTop: 'var(--space-3)' }}>
                      {(q.options || []).map((opt, j) => {
                        let rowClass = 'submission-option';
                        if (j === correctAns) rowClass += ' submission-option--correct';
                        else if (j === studentAns) rowClass += ' submission-option--wrong';

                        return (
                          <div key={j} className={rowClass}>
                            <span style={{ fontWeight: 'bold' }}>{String.fromCharCode(65 + j)}.</span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {j === correctAns && <HiOutlineCheckCircle style={{ color: 'var(--success-500)', fontSize: '1.2rem' }} />}
                            {j === studentAns && j !== correctAns && <HiOutlineXCircle style={{ color: 'var(--danger-500)', fontSize: '1.2rem' }} />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="submission-explanation">
                        <strong style={{ color: 'var(--warning-600)' }}>💡 Giải thích:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Essay
                const studentEssay = submission.essayAnswers?.find(e => e.questionId === q.id);
                const grade = submission.essayGrades?.[q.id];

                return (
                  <div key={q.id} className="submission-question">
                    <h4>Câu {i + 1} (Tự luận): {q.question}</h4>
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="minh họa" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', margin: 'var(--space-3) 0', borderRadius: 'var(--radius-md)' }} />
                    )}

                    <div className="submission-essay-box" style={{ borderColor: 'var(--border-primary)' }}>
                      <strong>Bài làm của sinh viên:</strong>
                      <p>{studentEssay?.answer || '(Bỏ trống)'}</p>
                    </div>

                    {q.sampleAnswer && (
                      <div className="submission-essay-box" style={{ borderColor: 'var(--warning-200)', background: 'rgba(245, 158, 11, 0.05)' }}>
                        <strong style={{ color: 'var(--warning-600)' }}>Đáp án tham khảo:</strong>
                        <p>{q.sampleAnswer}</p>
                      </div>
                    )}

                    {grade !== undefined && (
                      <div className="submission-explanation" style={{ background: 'var(--success-50)', borderColor: 'var(--success-200)' }}>
                        <strong style={{ color: 'var(--success-600)' }}>Điểm tự luận:</strong> {grade} / {q.maxScore || 10}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
