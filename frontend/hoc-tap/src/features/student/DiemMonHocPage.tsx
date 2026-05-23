/**
 * Student DiemMonHocPage — Read-only grade view (respects ChoPhepXemDiem)
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { diemMonHocApi } from '../../api/diemMonHocApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { useAuth } from '../../shared/contexts/AuthContext';
import type { DiemMonHoc } from '../../shared/types';
import { formatScore } from '../../shared/utils/helpers';
import { HiOutlineLockClosed } from 'react-icons/hi2';

interface Props {
  maLopMon: string;
}

export default function StudentDiemMonHocPage({ maLopMon }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<DiemMonHoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [permitted, setPermitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allDiem, allLmh] = await Promise.all([
        diemMonHocApi.getAll(),
        lopMonHocApi.getAll(),
      ]);
      const lmh = allLmh.find((l) => l.MaLopMon === maLopMon);
      setPermitted(lmh?.ChoPhepXemDiem ?? false);
      if (lmh?.ChoPhepXemDiem) {
        const myDiem = allDiem.filter((d) => d.MaLopMon === maLopMon && d.MaSV === user?.username);
        setData(myDiem);
      }
    } catch {
      toast.error('Không thể tải điểm');
    } finally {
      setLoading(false);
    }
  }, [maLopMon, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>;
  }

  if (!permitted) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <HiOutlineLockClosed style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Chưa mở xem điểm</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Giáo viên chưa cho phép xem điểm môn học này.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Mã điểm</th>
              <th>Điểm GK</th>
              <th>Điểm CK</th>
              <th>Điểm TK</th>
              <th>Điểm H4</th>
              <th>Điểm chữ</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} className="empty-cell">Chưa có điểm</td></tr>
            ) : data.map((row) => (
              <tr key={row.MaDiem}>
                <td>{row.MaDiem}</td>
                <td>{formatScore(row.DiemGK)}</td>
                <td>{formatScore(row.DiemCK)}</td>
                <td>{formatScore(row.DiemTK)}</td>
                <td>{formatScore(row.DiemH4)}</td>
                <td>{row.DiemChu || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
