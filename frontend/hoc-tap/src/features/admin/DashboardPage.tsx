/**
 * DashboardPage — Admin dashboard placeholder
 */
import { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineBookOpen, HiOutlineCalendarDays, HiOutlineBuildingOffice } from 'react-icons/hi2';
import { thongKeApi } from '../../api/thongKeApi';
import type { ThongKeResponse } from '../../api/thongKeApi';

export default function DashboardPage() {
  const [data, setData] = useState<ThongKeResponse | null>(null);

  useEffect(() => {
    thongKeApi.getThongKe()
      .then(res => setData(res))
      .catch(err => console.error("Failed to fetch dashboard stats", err));
  }, []);

  const stats = [
    { icon: <HiOutlineUsers />, label: 'Sinh viên', value: data ? data.sinh_vien : '—', color: 'var(--teams-accent)', bg: 'rgba(98, 100, 167, 0.15)' },
    { icon: <HiOutlineUsers />, label: 'Giáo viên', value: data ? data.giao_vien : '—', color: 'var(--teams-accent)', bg: 'rgba(98, 100, 167, 0.15)' },
    { icon: <HiOutlineBookOpen />, label: 'Môn học', value: data ? data.mon_hoc : '—', color: 'var(--teams-accent)', bg: 'rgba(98, 100, 167, 0.15)' },
    { icon: <HiOutlineBuildingOffice />, label: 'Lớp học', value: data ? data.lop_hoc : '—', color: 'var(--teams-accent)', bg: 'rgba(98, 100, 167, 0.15)' },
  ];

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Bảng điều khiển</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-5)' }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-lg)',
              background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div className="card-header">
          <span className="card-title">
            <HiOutlineCalendarDays style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Chào mừng đến trang Quản trị
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Sử dụng menu bên trái để quản lý sinh viên, giáo viên, lớp học, môn học, điểm số và lịch học.
        </p>
      </div>
    </div>
  );
}
