/**
 * QuizCreateTab — Two modes: AI (Gemini RAG) + Manual (trắc nghiệm / tự luận)
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { quizApi, type Quiz, type ManualQuestionInput } from '../../api/quizApi';
import { driveApi, type DriveFile } from '../../api/driveApi';
import axiosClient from '../../api/axiosClient';
import {
  HiOutlineSparkles,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlinePlusCircle,
  HiOutlineFolderOpen,
} from 'react-icons/hi2';
import './QuizCreate.css';

interface QuizCreateTabProps {
  maLopMon: string;
  editingQuiz?: Quiz | null;
  onCancelEdit?: () => void;
}

type Mode = 'select' | 'ai' | 'manual';

interface ManualQuestion {
  id?: string;
  type: 'multiple_choice' | 'essay';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sampleAnswer: string;
  imageUrl?: string;
  maxScore?: number;
}

export default function QuizCreateTab({ maLopMon, editingQuiz, onCancelEdit }: QuizCreateTabProps) {
  const [mode, setMode] = useState<Mode>('select');

  // AI mode
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Manual mode
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', sampleAnswer: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [customScoring, setCustomScoring] = useState(false);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Load editing quiz if any
  useEffect(() => {
    if (editingQuiz) {
      setEditingQuizId(editingQuiz.id);
      setTitle(editingQuiz.title);
      setDuration(editingQuiz.duration);
      setQuestions(editingQuiz.questions.map(q => ({
        id: q.id,
        type: q.type || 'multiple_choice',
        question: q.question,
        options: q.options || ['', '', '', ''],
        correctAnswer: q.correctAnswer || 0,
        explanation: q.explanation || '',
        sampleAnswer: q.sampleAnswer || '',
        imageUrl: q.imageUrl || '',
        maxScore: q.maxScore || parseFloat((10.0 / editingQuiz.questions.length).toFixed(1)),
      })));
      setCustomScoring(editingQuiz.questions.some(q => q.maxScore !== undefined));
      setMode('manual');
    }
  }, [editingQuiz]);

  // AI helpers
  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      const data = await driveApi.listByLopMon(maLopMon);
      setFiles(data);
    } catch {
      setFiles([]);
      toast.error('Không thể tải danh sách tài liệu');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!selectedFile) return;
    try {
      setGenerating(true);
      const result = await quizApi.generate(selectedFile.id, maLopMon, numQuestions);
      // Populate manual mode
      setTitle(result.title);
      setDuration(result.duration);
      setQuestions(result.questions.map(q => ({
        id: q.id,
        type: q.type || 'multiple_choice',
        question: q.question,
        options: q.options || ['', '', '', ''],
        correctAnswer: q.correctAnswer || 0,
        explanation: q.explanation || '',
        sampleAnswer: q.sampleAnswer || '',
        imageUrl: '',
        maxScore: parseFloat((10.0 / result.questions.length).toFixed(1)),
      })));
      setCustomScoring(true);
      setMode('manual');
      toast.success('AI tạo quiz thành công! Hãy xem và chỉnh sửa trước khi lưu.');
    } catch {
      toast.error('Tạo quiz thất bại. Vui lòng kiểm tra Gemini API Key.');
    } finally {
      setGenerating(false);
    }
  };

  // Manual helpers
  const addQuestion = (type: 'multiple_choice' | 'essay') => {
    setQuestions([...questions, {
      type,
      question: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : [],
      correctAnswer: 0,
      explanation: '',
      sampleAnswer: '',
    }]);
  };

  const updateQuestion = (index: number, field: string, value: unknown) => {
    const updated = [...questions];
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const uploadImage = async (index: number, file: File) => {
    try {
      toast.loading('Đang tải ảnh lên...', { id: 'upload-img' });
      const df = await driveApi.upload(file, maLopMon, 'hinh_anh');
      // Using local backend proxy to bypass Google viewing restrictions
      const imgUrl = `${axiosClient.defaults.baseURL}/drive/image/${df.id}`;
      updateQuestion(index, 'imageUrl', imgUrl);
      toast.success('Tải ảnh thành công', { id: 'upload-img' });
    } catch {
      toast.error('Lỗi khi tải ảnh', { id: 'upload-img' });
    }
  };

  const handleManualSubmit = async () => {
    const valid = questions.every((q) => q.question.trim());
    if (!valid) {
      toast.error('Vui lòng nhập đầy đủ nội dung câu hỏi');
      return;
    }
    
    // Feature: Thêm kiểm tra tính lặp lại của tên câu hỏi
    const questionsTexts = questions.map(q => q.question.trim().toLowerCase());
    const hasDuplicates = new Set(questionsTexts).size !== questionsTexts.length;
    if (hasDuplicates) {
      toast.error('Cảnh báo: Có ít nhất hai câu hỏi bị trùng lặp nội dung. Vui lòng kiểm tra lại!');
      return;
    }

    
    if (customScoring) {
      const sum = questions.reduce((acc, q) => acc + (q.maxScore || 0), 0);
      if (Math.abs(sum - 10.0) > 0.05) {
        toast.error(`Tổng số điểm của các câu phải đúng bằng 10.0. Hiện tại: ${sum.toFixed(1)}`);
        return;
      }
    }
    
    try {
      setSubmitting(true);
      const payload: ManualQuestionInput[] = questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        imageUrl: q.imageUrl,
        maxScore: customScoring ? (q.maxScore || 0) : parseFloat((10.0 / questions.length).toFixed(1)),
        ...(q.type === 'multiple_choice' ? { options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation } : {}),
        ...(q.type === 'essay' ? { sampleAnswer: q.sampleAnswer } : {}),
      }));
      let result;
      if (editingQuizId) {
        result = await quizApi.update(editingQuizId, maLopMon, title, duration, payload);
        toast.success('Cập nhật bài kiểm tra thành công!');
      } else {
        result = await quizApi.createManual(maLopMon, title, duration, payload);
        toast.success('Tạo bài kiểm tra thành công!');
      }
      setQuiz(result);
    } catch {
      toast.error(editingQuizId ? 'Cập nhật thất bại' : 'Tạo bài kiểm tra thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Result view
  if (quiz) {
    return (
      <div className="quiz-create animate-fade-in">
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <HiOutlineCheckCircle style={{ fontSize: '1.5rem', color: 'var(--success-400)' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Bài kiểm tra đã tạo</h3>
            <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{quiz.type === 'ai' ? 'AI' : 'Thủ công'}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            <strong>{quiz.title}</strong> — {quiz.questions.length} câu • {quiz.duration} phút
          </p>
          {quiz.questions.map((q, i) => (
            <div key={q.id} className="quiz-preview-question">
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <strong>Câu {i + 1}:</strong>
                <span className={`badge ${q.type === 'essay' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                  {q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}
                </span>
              </div>
              <p>{q.question}</p>
              {q.options && q.options.length > 0 && (
                <div className="quiz-preview-options">
                  {q.options.map((opt, j) => (
                    <div key={j} className={`quiz-preview-option ${j === q.correctAnswer ? 'quiz-preview-option--correct' : ''}`}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </div>
                  ))}
                  {q.explanation && (
                    <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--warning-600)' }}>💡 Giải thích:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { 
                setQuiz(null); 
                setEditingQuizId(null); 
                setMode('select'); 
                if (onCancelEdit) onCancelEdit();
              }}>
              <HiOutlinePlusCircle /> Tạo mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode selection
  if (mode === 'select') {
    return (
      <div className="quiz-create animate-fade-in">
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>Chọn cách tạo bài kiểm tra</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => { setMode('ai'); loadFiles(); }}>
            <HiOutlineSparkles style={{ fontSize: '2.5rem', color: 'var(--warning-400)', marginBottom: 'var(--space-3)' }} />
            <h4 style={{ color: 'var(--text-primary)' }}>Tạo bằng AI</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
              Gemini AI đọc tài liệu trên Drive và tự động tạo câu hỏi trắc nghiệm
            </p>
          </div>
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setMode('manual')}>
            <HiOutlinePencilSquare style={{ fontSize: '2.5rem', color: 'var(--teams-accent)', marginBottom: 'var(--space-3)' }} />
            <h4 style={{ color: 'var(--text-primary)' }}>Tạo thủ công</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
              Tự tạo câu hỏi trắc nghiệm hoặc tự luận
            </p>
          </div>
        </div>
      </div>
    );
  }

  // AI mode
  if (mode === 'ai') {
    return (
      <div className="quiz-create animate-fade-in">
        <button className="btn btn-ghost" onClick={() => setMode('select')} style={{ marginBottom: 'var(--space-4)' }}>← Quay lại</button>
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
            <HiOutlineSparkles style={{ color: 'var(--warning-400)' }} /> Tạo quiz bằng AI
          </h3>
          {loadingFiles ? (
            <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
              <p>Chưa có tài liệu nào trong lớp này</p>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>Hãy tải tài liệu lên trước ở tab "Tài liệu"</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Chọn tài liệu nguồn:</label>
                {files.map((file) => (
                  <div key={file.id}
                    className={`quiz-file-option ${selectedFile?.id === file.id ? 'quiz-file-option--selected' : ''}`}
                    onClick={() => setSelectedFile(file)}>
                    {file.mimeType === 'application/vnd.google-apps.folder' ? <HiOutlineFolderOpen style={{ color: 'var(--warning-400)' }} /> : <HiOutlineDocumentText />} 
                    <span>{file.name}</span>
                    {selectedFile?.id === file.id && <HiOutlineCheckCircle style={{ color: 'var(--success-400)', marginLeft: 'auto' }} />}
                  </div>
                ))}
              </div>
              <div className="input-group">
                <label>Số câu hỏi</label>
                <input className="input" type="number" min={5} max={50} value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleAIGenerate} disabled={generating || !selectedFile}>
                  <HiOutlineSparkles /> {generating ? 'Đang tạo...' : 'Tạo quiz'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Manual mode
  return (
    <div className="quiz-create animate-fade-in">
      <button className="btn btn-ghost" onClick={() => { setMode('select'); if (onCancelEdit) onCancelEdit(); }} style={{ marginBottom: 'var(--space-4)' }}>← Quay lại</button>
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          <HiOutlinePencilSquare style={{ color: 'var(--teams-accent)' }} /> {editingQuizId ? 'Sửa bài kiểm tra' : 'Tạo bài kiểm tra thủ công'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div className="input-group">
            <label>Tiêu đề bài kiểm tra</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Kiểm tra giữa kỳ" />
          </div>
          <div className="input-group">
            <label>Thời gian (phút)</label>
            <input className="input" type="number" min={5} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
        </div>
        
        <div style={{ marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', userSelect: 'none' }}>
            <input type="checkbox" checked={customScoring} onChange={e => {
              setCustomScoring(e.target.checked);
              if (e.target.checked) setQuestions(qs => qs.map(q => ({ ...q, maxScore: q.maxScore || parseFloat((10.0/qs.length).toFixed(1)) })));
            }} />
            Tùy chỉnh điểm (Tổng: 10đ. Bỏ chọn: Chia đều)
          </label>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} style={{
            padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
            border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Câu {qi + 1}</strong>
              <select className="input" value={q.type} onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}>
                <option value="multiple_choice">Trắc nghiệm</option>
                <option value="essay">Tự luận</option>
              </select>
              {questions.length > 1 && (
                <button className="btn btn-ghost btn-icon btn-sm action-delete" onClick={() => removeQuestion(qi)} style={{ marginLeft: 'auto' }}>
                  <HiOutlineTrash />
                </button>
              )}
            </div>

            <div className="input-group">
              <label>Nội dung câu hỏi</label>
              <textarea className="input" rows={2} value={q.question} onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
                placeholder="Nhập câu hỏi..." style={{ resize: 'vertical' }} />
            </div>

            {customScoring && (
              <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label>Điểm câu hỏi (Tối thiểu 0.1, Tổng cả bài: 10đ)</label>
                <input 
                  type="number" 
                  className="input" 
                  min={0.1}
                  step={0.1}
                  max={parseFloat((10.0 - questions.reduce((acc, curr, idx) => idx === qi ? acc : acc + (curr.maxScore || 0), 0)).toFixed(1))}
                  value={q.maxScore === undefined ? '' : q.maxScore}
                  onChange={e => updateQuestion(qi, 'maxScore', parseFloat(e.target.value) || 0)}
                  style={{ width: '100px' }}
                />
              </div>
            )}

            <div className="input-group">
              <label>Hình ảnh (Minh hoạ - tuỳ chọn)</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input" style={{ flex: 1 }} value={q.imageUrl || ''} onChange={e => updateQuestion(qi, 'imageUrl', e.target.value)} placeholder="Nhập URL ảnh hoặc Tải lên..." />
                <input type="file" id={`q-img-upload-${qi}`} style={{ display: 'none' }} accept="image/*" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) uploadImage(qi, e.target.files[0]);
                }} />
                <button className="btn btn-secondary" onClick={() => document.getElementById(`q-img-upload-${qi}`)?.click()}>Tải lên</button>
              </div>
              {q.imageUrl && <img src={q.imageUrl} alt="preview" style={{ maxHeight: '100px', objectFit: 'contain', marginTop: 'var(--space-2)', borderRadius: 'var(--radius-md)' }} />}
            </div>

            {q.type === 'multiple_choice' && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', display: 'block' }}>
                  Đáp án (chọn đáp án đúng):
                </label>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <input type="radio" name={`q-${qi}`} checked={q.correctAnswer === oi}
                      onChange={() => updateQuestion(qi, 'correctAnswer', oi)} />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', minWidth: 20 }}>{String.fromCharCode(65 + oi)}.</span>
                    <input className="input" value={opt} placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                      onChange={(e) => updateOption(qi, oi, e.target.value)} style={{ flex: 1 }} />
                  </div>
                ))}
                <div className="input-group" style={{ marginTop: 'var(--space-3)' }}>
                  <label>Giải thích đáp án đúng (tuỳ chọn - hiển thị khi SV xem lại)</label>
                  <textarea className="input" rows={2} value={q.explanation}
                    onChange={(e) => updateQuestion(qi, 'explanation', e.target.value)}
                    placeholder="Nhập lý do tại sao phương án này là đúng..." style={{ resize: 'vertical' }} />
                </div>
              </div>
            )}

            {q.type === 'essay' && (
              <div className="input-group" style={{ marginTop: 'var(--space-3)' }}>
                <label>Đáp án mẫu (tùy chọn)</label>
                <textarea className="input" rows={2} value={q.sampleAnswer}
                  onChange={(e) => updateQuestion(qi, 'sampleAnswer', e.target.value)}
                  placeholder="Nhập đáp án mẫu (giáo viên xem)..." style={{ resize: 'vertical' }} />
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-secondary" onClick={() => addQuestion('multiple_choice')}>
            <HiOutlinePlusCircle /> Thêm trắc nghiệm
          </button>
          <button className="btn btn-secondary" onClick={() => addQuestion('essay')}>
            <HiOutlinePlusCircle /> Thêm tự luận
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost" onClick={() => { setMode('select'); if (onCancelEdit) onCancelEdit(); }}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleManualSubmit} disabled={submitting}>
            {submitting ? 'Đang lưu...' : (editingQuizId ? 'Cập nhật bài kiểm tra' : 'Tạo bài kiểm tra')}
          </button>
        </div>
      </div>
    </div>
  );
}
