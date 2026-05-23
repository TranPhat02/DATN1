/**
 * ThongBaoChungPage — Read-only system announcements for Student & Teacher.
 * No create/edit/delete actions.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBell, HiOutlinePaperClip } from 'react-icons/hi2';
import { announcementApi } from '../../api/announcementApi';
import type { Announcement } from '../../api/announcementApi';

export default function ThongBaoChungPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await announcementApi.get('global');
      setAnnouncements(data);
    } catch {
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <HiOutlineBell style={{ color: 'var(--warning-500)' }} /> Thông báo Hệ thống
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Các thông báo chung từ nhà trường và bộ môn.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <div className="spinner" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <HiOutlineBell style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <h3>Chưa có thông báo nào</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Các thông báo mới từ hệ thống sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {announcements.map((a) => (
            <div key={a.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h4 style={{ margin: 0, color: 'var(--primary-600)' }}>{a.title}</h4>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                  {new Date(a.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Đăng bởi: <strong>{a.author}</strong>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, marginBottom: a.fileUrl ? 'var(--space-3)' : 0 }}>{a.content}</p>
              {a.fileUrl && (
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <HiOutlinePaperClip /> {a.fileName || 'Tệp đính kèm'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
