/**
 * Student DiemTracNghiemPage — Read-only quiz grades (respects ChoPhepXemQuiz)
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { diemTracNghiemApi } from '../../api/diemTracNghiemApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { useAuth } from '../../shared/contexts/AuthContext';
import type { DiemTracNghiem } from '../../shared/types';
import { HiOutlineLockClosed, HiOutlineEye } from 'react-icons/hi2';
import SubmissionDetailModal from '../../shared/components/SubmissionDetailModal';

interface Props {
  maLopMon: string;
}

export default function StudentDiemTracNghiemPage({ maLopMon }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<DiemTracNghiem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permitted, setPermitted] = useState(false);
  const [viewingQuizId, setViewingQuizId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allDtn, allLmh] = await Promise.all([
        diemTracNghiemApi.getAll(),
        lopMonHocApi.getAll(),
      ]);
      const lmh = allLmh.find((l) => l.MaLopMon === maLopMon);
      setPermitted(lmh?.ChoPhepXemQuiz ?? false);
      if (lmh?.ChoPhepXemQuiz) {
        setData(allDtn.filter((d) => d.MaLopMon === maLopMon && d.MaSV === user?.username));
      }
    } catch {
      toast.error('Không thể tải điểm TN');
    } finally {
      setLoading(false);
    }
  }, [maLopMon, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>;

  if (!permitted) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <HiOutlineLockClosed style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Chưa mở xem điểm TN</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Giáo viên chưa cho phép xem điểm trắc nghiệm.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tên bài trắc nghiệm</th>
              <th>Số câu đúng</th>
              <th>Tổng số câu</th>
              <th>Điểm</th>
              <th>Vi phạm</th>
              <th>Thời gian làm</th>
              <th>Thời gian nộp</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={8} className="empty-cell">Chưa có điểm trắc nghiệm</td></tr>
            ) : data.map((row) => (
              <tr key={row.MaTN}>
                <td style={{ fontWeight: 500 }}>{row.FileID || row.MaTN}</td>
                <td>{row.SoCauDung ?? '—'}</td>
                <td>{row.TongSoCau ?? '—'}</td>
                <td>
                  {row.SoCauDung !== null && row.TongSoCau !== null && row.TongSoCau! > 0
                    ? `${((row.SoCauDung! / row.TongSoCau!) * 10).toFixed(1)}`
                    : '—'}
                </td>
                <td style={{ color: (row.SoLanViPham || 0) > 0 ? 'var(--danger-600)' : 'inherit', fontWeight: (row.SoLanViPham || 0) > 0 ? 'bold' : 'normal' }}>
                  {row.SoLanViPham || 0}
                </td>
                <td>
                  {row.ThoiGianLam != null
                    ? `${Math.floor(row.ThoiGianLam / 60)}p ${row.ThoiGianLam % 60}s`
                    : '—'}
                </td>
                <td>
                  {row.ThoiGianNop
                    ? new Date(row.ThoiGianNop).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                    : '—'}
                </td>
                <td>
                   <button className="btn btn-ghost btn-sm" onClick={() => setViewingQuizId(row.MaTN.split('_')[0])} title="Xem chi tiết bài làm">
                     <HiOutlineEye /> Xem chi tiết
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {viewingQuizId && (
        <SubmissionDetailModal
          quizId={viewingQuizId}
          maSV={user?.username || ''}
          onClose={() => setViewingQuizId(null)}
        />
      )}
    </div>
  );
}
