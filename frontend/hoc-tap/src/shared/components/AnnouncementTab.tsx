/**
 * AnnouncementTab — Class announcements (inside a LopMonHoc).
 * Teachers: create, edit, delete.
 * Students: read-only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineBell,
  HiOutlinePlus,
  HiOutlinePaperClip,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { announcementApi } from '../../api/announcementApi';
import type { Announcement } from '../../api/announcementApi';
import { driveApi } from '../../api/driveApi';

interface Props {
  maLopMon: string;
  isTeacher?: boolean;
}

export default function AnnouncementTab({ maLopMon, isTeacher }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await announcementApi.get(maLopMon);
      setAnnouncements(data);
    } catch {
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }, [maLopMon]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // ── Update ──
        await announcementApi.update(maLopMon, editingId, title, content);
        toast.success('Đã cập nhật thông báo');
      } else {
        // ── Create ──
        let fileId, fileName, fileUrl;
        if (file) {
          const uploadRes = await driveApi.upload(file, maLopMon, 'thong_bao');
          fileId = uploadRes.id;
          fileUrl = uploadRes.webViewLink;
          fileName = file.name;
        }
        await announcementApi.create(maLopMon, title, content, fileId, fileName, fileUrl);
        toast.success('Đã thêm thông báo mới');
      }

      resetForm();
      fetchAnnouncements();
    } catch {
      toast.error('Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá thông báo này?')) return;
    try {
      await announcementApi.remove(maLopMon, id);
      toast.success('Đã xoá thông báo');
      fetchAnnouncements();
    } catch {
      toast.error('Xoá thất bại');
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0 }}>
            <HiOutlineBell style={{ color: 'var(--warning-500)' }} /> Thông báo lớp học
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>Cập nhật các thông tin mới nhất từ giáo viên</p>
        </div>
        {isTeacher && !showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <HiOutlinePlus /> Thêm thông báo
          </button>
        )}
      </div>

      {/* ── Create/Edit Form ── */}
      {isTeacher && showForm && (
        <form className="card" onSubmit={handleSubmit} style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)', border: '1px solid var(--primary-300)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}>
            {editingId ? 'Sửa thông báo' : 'Tạo thông báo mới'}
          </h4>
          <div className="input-group">
            <label>Tiêu đề</label>
            <input
              className="input"
              placeholder="Nhập tiêu đề thông báo..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label>Nội dung</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Nhập nội dung chi tiết..."
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={submitting}
            />
          </div>
          {!editingId && (
            <div className="input-group">
              <label>Đính kèm tài liệu</label>
              <input
                type="file"
                className="input file-input"
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                disabled={submitting}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={submitting}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : editingId ? 'Cập nhật' : 'Đăng thông báo'}
            </button>
          </div>
        </form>
      )}

      {/* ── Announcement List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <div className="spinner" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <HiOutlineBell style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <h3>Chưa có thông báo nào</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Các thông báo mới của lớp sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {announcements.map((a) => (
            <div key={a.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h4 style={{ margin: 0, color: 'var(--primary-600)' }}>{a.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                    {new Date(a.createdAt).toLocaleString('vi-VN')}
                  </span>
                  {isTeacher && (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEdit(a)}
                        title="Sửa"
                        style={{ padding: '4px 8px' }}
                      >
                        <HiOutlinePencilSquare />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(a.id)}
                        title="Xoá"
                        style={{ padding: '4px 8px', color: 'var(--danger-400)' }}
                      >
                        <HiOutlineTrash />
                      </button>
                    </>
                  )}
                </div>
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
