/**
 * Sidebar — Single-column collapsible MS Teams-style layout
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  HiOutlineAcademicCap,
  HiOutlineUsers,
  HiOutlineBookOpen,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineTableCells,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineRectangleGroup,
  HiOutlineKey,
  HiOutlineChartBar,
  HiOutlineBell,
  HiOutlineBars3,
} from 'react-icons/hi2';
import './Sidebar.css';

export interface SidebarItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
  color?: string;
}

export default function Sidebar({ items, title, color = 'var(--teams-accent)' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={clsx('teams-sidebar', collapsed && 'teams-sidebar--collapsed')}
      style={{ width: collapsed ? '64px' : 'var(--teams-panel-width)' }}
    >
      {/* ── Header / Brand ── */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-header-left">
            <div className="sidebar-brand" style={{ background: color }}>
              <HiOutlineAcademicCap />
            </div>
            <span className="sidebar-title">{title}</span>
          </div>
        )}
        <button
          className="sidebar-toggle-btn-header"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <HiOutlineBars3 />
        </button>
      </div>

      {/* ── Nav links ── */}
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'sidebar-link--active')
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}

// ── Predefined menu configs ──
export const ADMIN_MENU: SidebarItem[] = [
  { path: '/admin', label: 'Bảng điều khiển', icon: <HiOutlineRectangleGroup />, end: true },
  { path: '/admin/sinh-vien', label: 'Sinh viên', icon: <HiOutlineUsers /> },
  { path: '/admin/giao-vien', label: 'Giáo viên', icon: <HiOutlineUserGroup /> },
  { path: '/admin/khoa-hoc', label: 'Khoá học', icon: <HiOutlineBuildingOffice2 /> },
  { path: '/admin/lop', label: 'Lớp', icon: <HiOutlineBuildingOffice2 /> },
  { path: '/admin/mon-hoc', label: 'Môn học', icon: <HiOutlineBookOpen /> },
  { path: '/admin/lop-mon-hoc', label: 'Lớp môn học', icon: <HiOutlineTableCells /> },
  { path: '/admin/nam-hoc', label: 'Năm học', icon: <HiOutlineCalendarDays /> },
  { path: '/admin/hoc-ki', label: 'Học kì', icon: <HiOutlineClipboardDocumentList /> },
  { path: '/admin/tai-khoan', label: 'Tài khoản', icon: <HiOutlineKey /> },
  { path: '/admin/diem-mon-hoc', label: 'Điểm môn học', icon: <HiOutlineChartBar /> },
  { path: '/admin/diem-trac-nghiem', label: 'Điểm trắc nghiệm', icon: <HiOutlineDocumentText /> },
  { path: '/admin/sv-lop-mon-hoc', label: 'SV - Lớp môn học', icon: <HiOutlineCog6Tooth /> },
  { path: '/admin/lich-hoc', label: 'Lịch học', icon: <HiOutlineCalendarDays /> },
  { path: '/admin/tai-lieu', label: 'Tài liệu', icon: <HiOutlineDocumentText /> },
  { path: '/admin/thong-bao', label: 'Thông báo', icon: <HiOutlineBell /> },
];

export const STUDENT_MENU: SidebarItem[] = [
  { path: '/student', label: 'Phòng học', icon: <HiOutlineBuildingOffice2 />, end: true },
  { path: '/student/lich-hoc', label: 'Lịch học', icon: <HiOutlineCalendarDays /> },
  { path: '/student/ket-qua', label: 'Kết quả học tập', icon: <HiOutlineChartBar /> },
  { path: '/student/thong-bao', label: 'Thông báo', icon: <HiOutlineBell /> },
];

export const TEACHER_MENU: SidebarItem[] = [
  { path: '/teacher', label: 'Phòng học', icon: <HiOutlineBuildingOffice2 />, end: true },
  { path: '/teacher/lich-day', label: 'Lịch dạy', icon: <HiOutlineCalendarDays /> },
  { path: '/teacher/thong-bao', label: 'Thông báo', icon: <HiOutlineBell /> },
];
