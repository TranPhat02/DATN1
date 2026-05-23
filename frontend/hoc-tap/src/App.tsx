/**
 * App — Root component with React Router
 * Feature-based routing with role-based access control
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './shared/contexts/AuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import LoadingSpinner from './shared/components/LoadingSpinner';
import { ROLES, ROUTES } from './shared/utils/constants';

// ── Auth ──
import LoginPage from './features/auth/LoginPage';

// ── Admin ──
import AdminLayout from './features/admin/AdminLayout';
import DashboardPage from './features/admin/DashboardPage';
import SinhVienPage from './features/admin/SinhVienPage';
import GiaoVienPage from './features/admin/GiaoVienPage';
import LopPage from './features/admin/LopPage';
import MonHocPage from './features/admin/MonHocPage';
import LopMonHocPage from './features/admin/LopMonHocPage';
import NamHocPage from './features/admin/NamHocPage';
import HocKiPage from './features/admin/HocKiPage';
import KhoaHocPage from './features/admin/KhoaHocPage';
import TaiKhoanPage from './features/admin/TaiKhoanPage';
import AdminDiemMonHocPage from './features/admin/DiemMonHocPage';
import AdminDiemTracNghiemPage from './features/admin/DiemTracNghiemPage';
import SinhVienLopMonHocPage from './features/admin/SinhVienLopMonHocPage';
import AdminLichHocPage from './features/admin/LichHocPage';
import AdminTaiLieuPage from './features/admin/TaiLieuPage';
import AdminThongBaoPage from './features/admin/AdminThongBaoPage';

// ── Teacher ──
import TeacherLayout from './features/teacher/TeacherLayout';
import TeacherClassroomList from './features/teacher/ClassroomListPage';
import TeacherClassroomDetail from './features/teacher/ClassroomDetailPage';
import TeacherLichDay from './features/teacher/LichDayPage';

// ── Student ──
import StudentLayout from './features/student/StudentLayout';
import StudentClassroomList from './features/student/ClassroomListPage';
import StudentClassroomDetail from './features/student/ClassroomDetailPage';
import StudentLichHoc from './features/student/LichHocPage';
import StudentKetQua from './features/student/KetQuaHocTapPage';
import ProfilePage from './shared/components/ProfilePage';
import ThongBaoChungPage from './shared/components/ThongBaoChungPage';

export default function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage message="Đang khởi tạo..." />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-size-sm)',
          },
          success: {
            iconTheme: { primary: 'var(--success-500)', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: 'var(--danger-500)', secondary: 'white' },
          },
        }}
      />

      <Routes>
        {/* ── Public ── */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        {/* ── Admin routes ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route element={<AdminLayout />}>
            <Route path={ROUTES.ADMIN} element={<DashboardPage />} />
            <Route path={ROUTES.ADMIN_SINHVIEN} element={<SinhVienPage />} />
            <Route path={ROUTES.ADMIN_GIAOVIEN} element={<GiaoVienPage />} />
            <Route path={ROUTES.ADMIN_LOP} element={<LopPage />} />
            <Route path={ROUTES.ADMIN_MONHOC} element={<MonHocPage />} />
            <Route path={ROUTES.ADMIN_LOPMONHOC} element={<LopMonHocPage />} />
            <Route path={ROUTES.ADMIN_NAMHOC} element={<NamHocPage />} />
            <Route path={ROUTES.ADMIN_HOCKI} element={<HocKiPage />} />
            <Route path="/admin/khoa-hoc" element={<KhoaHocPage />} />
            <Route path={ROUTES.ADMIN_TAIKHOAN} element={<TaiKhoanPage />} />
            <Route path={ROUTES.ADMIN_DIEMMONHOC} element={<AdminDiemMonHocPage />} />
            <Route path={ROUTES.ADMIN_DIEMTRACNGHIEM} element={<AdminDiemTracNghiemPage />} />
            <Route path={ROUTES.ADMIN_SVLMH} element={<SinhVienLopMonHocPage />} />
            <Route path={ROUTES.ADMIN_LICHHOC} element={<AdminLichHocPage />} />
            <Route path={ROUTES.ADMIN_TAILIEU} element={<AdminTaiLieuPage />} />
            <Route path="/admin/thong-bao" element={<AdminThongBaoPage />} />
            <Route path="/admin/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ── Teacher routes ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]} />}>
          <Route element={<TeacherLayout />}>
            <Route path={ROUTES.TEACHER} element={<TeacherClassroomList />} />
            <Route path={ROUTES.TEACHER_CLASSROOM_DETAIL} element={<TeacherClassroomDetail />} />
            <Route path={ROUTES.TEACHER_LICHDAY} element={<TeacherLichDay />} />
            <Route path="/teacher/thong-bao" element={<ThongBaoChungPage />} />
            <Route path="/teacher/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ── Student routes ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
          <Route element={<StudentLayout />}>
            <Route path={ROUTES.STUDENT} element={<StudentClassroomList />} />
            <Route path={ROUTES.STUDENT_CLASSROOM_DETAIL} element={<StudentClassroomDetail />} />
            <Route path={ROUTES.STUDENT_LICHHOC} element={<StudentLichHoc />} />
            <Route path={ROUTES.STUDENT_KETQUA} element={<StudentKetQua />} />
            <Route path="/student/thong-bao" element={<ThongBaoChungPage />} />
            <Route path="/student/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </>
  );
}
