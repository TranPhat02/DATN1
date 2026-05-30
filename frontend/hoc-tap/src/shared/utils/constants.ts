/**
 * Constants — TN Education Platform
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export const ROUTES = {
  LOGIN: '/login',
  CHANGE_PASSWORD: '/doi-mat-khau',
  // Admin
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_SINHVIEN: '/admin/sinh-vien',
  ADMIN_GIAOVIEN: '/admin/giao-vien',
  ADMIN_LOP: '/admin/lop',
  ADMIN_MONHOC: '/admin/mon-hoc',
  ADMIN_LOPMONHOC: '/admin/lop-mon-hoc',
  ADMIN_NAMHOC: '/admin/nam-hoc',
  ADMIN_HOCKI: '/admin/hoc-ki',
  ADMIN_TAIKHOAN: '/admin/tai-khoan',
  ADMIN_DIEMMONHOC: '/admin/diem-mon-hoc',
  ADMIN_DIEMTRACNGHIEM: '/admin/diem-trac-nghiem',
  ADMIN_SVLMH: '/admin/sv-lop-mon-hoc',
  ADMIN_LICHHOC: '/admin/lich-hoc',
  ADMIN_TAILIEU: '/admin/tai-lieu',
  // Teacher
  TEACHER: '/teacher',
  TEACHER_CLASSROOMS: '/teacher',
  TEACHER_CLASSROOM_DETAIL: '/teacher/lop/:maLopMon',
  TEACHER_LICHDAY: '/teacher/lich-day',
  // Student
  STUDENT: '/student',
  STUDENT_CLASSROOMS: '/student',
  STUDENT_CLASSROOM_DETAIL: '/student/lop/:maLopMon',
  STUDENT_LICHHOC: '/student/lich-hoc',
  STUDENT_KETQUA: '/student/ket-qua',
} as const;

export const CA_SCHEDULE = [
  { key: 'Ca 1', label: 'Ca 1', time: '6:30 - 9:00' },
  { key: 'Ca 2', label: 'Ca 2', time: '9:05 - 11:30' },
  { key: 'Ca 3', label: 'Ca 3', time: '12:30 - 15:00' },
  { key: 'Ca 4', label: 'Ca 4', time: '15:05 - 17:30' },
] as const;

export const THU_SCHEDULE = [
  'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7',
] as const;

export const STORAGE_KEYS = {
  TOKEN: 'tn_token',
  USER: 'tn_user',
} as const;
