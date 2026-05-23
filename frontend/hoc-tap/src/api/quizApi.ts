/**
 * Quiz API service
 * Handles quiz creation (AI + manual), quiz taking, and grading.
 */
import axiosClient from './axiosClient';

export interface QuizQuestion {
  id: string;
  type?: 'multiple_choice' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  sampleAnswer?: string;
  imageUrl?: string;
  maxScore?: number;
}

export interface Quiz {
  id: string;
  maLopMon: string;
  title: string;
  type?: 'ai' | 'manual';
  questions: QuizQuestion[];
  duration: number;
  fileId?: string;
  createdAt?: string;
  lockType?: number;    // 0=open, 1=hard lock, 2=timed lock
  lockUntil?: string;   // ISO datetime
  isLocked?: boolean;   // computed by backend
}

export interface QuizSubmission {
  quizId: string;
  answers: Record<string, number | string>; // questionId -> selectedOption or essay text
  tabSwitchCount: number;
  timeSpent: number; // seconds spent on quiz
}

export interface QuizResult {
  maTN: string;
  soCauDung: number;
  tongSoCau: number;
  score: number;
  isRetake?: boolean;
}

export interface ManualQuestionInput {
  type: 'multiple_choice' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  sampleAnswer?: string;
  imageUrl?: string;
  maxScore?: number;
}

export interface QuizPendingSubmission {
  quizId: string;
  maSV: string;
  maLopMon: string;
  essayAnswers: Record<string, string>;
  mcTotal: number;
  soCauDung: number;
  score: number;
  submittedAt: string;
}

export interface SubmissionDetail {
  submission: QuizSubmission & {
    soCauDung: number;
    tongSoCau: number;
    mcTotal: number;
    score: number;
    finalScore?: number;
    essayAnswers: { questionId: string; answer: string }[];
    essayGrades?: Record<string, number>;
    status: string;
    submittedAt: string;
  };
  quiz: Quiz;
}

export interface MySubmissionInfo {
  quizId: string;
  status: string; // 'graded' | 'pending'
}

export interface QuizSubmissionRow {
  maSV: string;
  tenSV: string;
  soCauDung: number;
  tongSoCau: number;
  diem: number;
  thoiGianLam: number;
  thoiGianNop: string;
  soLanViPham: number;
  status: string;
}

export interface QuizSubmissionGroup {
  quizId: string;
  quizTitle: string;
  tenMH: string;
  maLopMon: string;
  totalSubmissions: number;
  submissions: QuizSubmissionRow[];
}

export const quizApi = {
  /** Generate quiz from Google Drive file using Gemini RAG */
  generate: async (fileId: string, maLopMon: string, numQuestions: number): Promise<Quiz> => {
    const { data } = await axiosClient.post<Quiz>('/quiz/generate', {
      file_id: fileId,
      ma_lop_mon: maLopMon,
      num_questions: numQuestions,
    });
    return data;
  },

  /** Create manual quiz with mixed question types */
  createManual: async (maLopMon: string, title: string, duration: number, questions: ManualQuestionInput[]): Promise<Quiz> => {
    const { data } = await axiosClient.post<Quiz>('/quiz/manual', {
      ma_lop_mon: maLopMon,
      title,
      duration,
      questions,
    });
    return data;
  },

  /** Edit an existing quiz */
  update: async (quizId: string, maLopMon: string, title: string, duration: number, questions: ManualQuestionInput[]): Promise<Quiz> => {
    const { data } = await axiosClient.put<Quiz>(`/quiz/${quizId}`, {
      ma_lop_mon: maLopMon,
      title,
      duration,
      questions,
    });
    return data;
  },

  /** Get quizzes for a class */
  listByLopMon: async (maLopMon: string): Promise<Quiz[]> => {
    const { data } = await axiosClient.get<Quiz[]>(`/quiz/list/${maLopMon}`);
    return data;
  },

  /** Get quiz by ID (for taking) */
  getById: async (quizId: string): Promise<Quiz> => {
    const { data } = await axiosClient.get<Quiz>(`/quiz/${quizId}`);
    return data;
  },

  /** Submit quiz answers */
  submit: async (submission: QuizSubmission): Promise<QuizResult> => {
    const { data } = await axiosClient.post<QuizResult>('/quiz/submit', submission);
    return data;
  },

  /** Delete a quiz */
  remove: async (quizId: string): Promise<void> => {
    await axiosClient.delete(`/quiz/${quizId}`);
  },

  /** Get pending submissions */
  listPendingSubmissions: async (maLopMon: string): Promise<QuizPendingSubmission[]> => {
    const { data } = await axiosClient.get<QuizPendingSubmission[]>(`/quiz/submissions/pending/${maLopMon}`);
    return data;
  },

  /** Grade submission */
  gradeSubmission: async (quizId: string, maSV: string, essayGrades: Record<string, number>): Promise<{ message: string, finalScore: number }> => {
    const { data } = await axiosClient.post('/quiz/grade', { quizId, maSV, essayGrades });
    return data;
  },

  /** Update quiz lock settings */
  updateLock: async (quizId: string, lockType: number, lockUntil: string = ''): Promise<{ message: string }> => {
    const { data } = await axiosClient.put(`/quiz/${quizId}/lock`, { lockType, lockUntil });
    return data;
  },

  /** Get full submission details including original questions and answers */
  getSubmissionDetail: async (quizId: string, maSV: string): Promise<SubmissionDetail> => {
    const { data } = await axiosClient.get<SubmissionDetail>(`/quiz/submission/${quizId}/${maSV}`);
    return data;
  },

  /** List all submissions for a lop_mon */
  listAllSubmissions: async (maLopMon: string): Promise<any[]> => {
    const { data } = await axiosClient.get<any[]>(`/quiz/submissions/${maLopMon}`);
    return data;
  },

  /** Get list of {quizId, status} that the student has already submitted */
  getMySubmissions: async (maLopMon: string): Promise<MySubmissionInfo[]> => {
    const { data } = await axiosClient.get<MySubmissionInfo[]>(`/quiz/my-submissions/${maLopMon}`);
    return data;
  },

  /** Get all submissions grouped by quiz (teacher view — organized by quiz name with TenMH) */
  getGroupedSubmissions: async (maLopMon: string): Promise<QuizSubmissionGroup[]> => {
    const { data } = await axiosClient.get<QuizSubmissionGroup[]>(`/quiz/grouped-submissions/${maLopMon}`);
    return data;
  },
};

