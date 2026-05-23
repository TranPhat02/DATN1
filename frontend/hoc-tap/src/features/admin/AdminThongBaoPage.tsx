/**
 * AdminThongBaoPage — Full CRUD for system announcements (admin only).
 * Create, edit, delete system announcements with recipient targeting.
 * Supports: multi-select courses, searchable student/teacher lists.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineBell,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePaperClip,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { announcementApi } from '../../api/announcementApi';
import type { Announcement } from '../../api/announcementApi';
import { driveApi } from '../../api/driveApi';
import { createCrudApi } from '../../api/crudApi';

interface KhoaHoc { MaKhoa: string; TenKhoa: string; }
interface SinhVien { MaSV: string; TenSV: string; Gmail?: string; MaKhoa?: string; }
interface GiaoVien { MaGV: string; TenGV: string; Gmail?: string; }

const khoaHocApi = createCrudApi<KhoaHoc, KhoaHoc, KhoaHoc>('/khoa-hoc');
const sinhVienApi = createCrudApi<SinhVien, SinhVien, SinhVien>('/sinh-vien');
const giaoVienApi = createCrudApi<GiaoVien, GiaoVien, GiaoVien>('/giao-vien');

/* ── Searchable Checkbox List ── */
function SearchableCheckList({
  label,
  items,
  selected,
  onToggle,
  getId,
  getLabel,
  getSubLabel,
}: {
  label: string;
  items: { id: string; name: string; sub?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  getId: (item: any) => string;
  getLabel: (item: any) => string;
  getSubLabel?: (item: any) => string;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        (i.sub && i.sub.toLowerCase().includes(q))
    );
  }, [items, search]);

  return (
    <div style={{ flex: 1, minWidth: 280 }}>
      <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', display: 'block' }}>
        {label} ({selected.length} đã chọn)
      </label>
      <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
        <HiOutlineMagnifyingGlass style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 14 }} />
        <input
          className="input"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 32, height: 34, fontSize: 'var(--font-size-sm)' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}
          >
            <HiOutlineXMark />
          </button>
        )}
      </div>
      <div style={{
        maxHeight: 220,
        overflowY: 'auto',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-1)',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            Không tìm thấy
          </div>
        ) : (
          filtered.map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                borderRadius: 'var(--radius-sm)',
                transition: 'background 0.12s',
                background: selected.includes(item.id) ? 'var(--bg-hover)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => onToggle(item.id)}
                style={{ accentColor: 'var(--teams-accent)' }}
              />
              <span style={{ flex: 1 }}>
                {item.name}
                {item.sub && (
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: 6, fontSize: 'var(--font-size-xs)' }}>
                    ({item.sub})
                  </span>
                )}
              </span>
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {selected.slice(0, 8).map((id) => {
            const item = items.find((i) => i.id === id);
            return (
              <span
                key={id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-hover)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                {item?.name || id}
                <HiOutlineXMark
                  style={{ cursor: 'pointer', fontSize: 12 }}
                  onClick={() => onToggle(id)}
                />
              </span>
            );
          })}
          {selected.length > 8 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', padding: '2px 4px' }}>
              +{selected.length - 8} khác
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminThongBaoPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Recipient targeting
  const [khoaHocs, setKhoaHocs] = useState<KhoaHoc[]>([]);
  const [allStudents, setAllStudents] = useState<SinhVien[]>([]);
  const [allTeachers, setAllTeachers] = useState<GiaoVien[]>([]);
  const [selectedKhoas, setSelectedKhoas] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [recipientMode, setRecipientMode] = useState<'all' | 'students' | 'teachers' | 'khoa' | 'custom'>('all');

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
    khoaHocApi.getAll().then(setKhoaHocs).catch(() => {});
    sinhVienApi.getAll().then(setAllStudents).catch(() => {});
    giaoVienApi.getAll().then(setAllTeachers).catch(() => {});
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setFile(null);
    setEditingId(null);
    setShowForm(false);
    setSelectedKhoas([]);
    setSelectedStudents([]);
    setSelectedTeachers([]);
    setRecipientMode('all');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    if (recipientMode === 'khoa' && selectedKhoas.length === 0) {
      toast.error('Vui lòng chọn ít nhất một khoá học');
      return;
    }

    if (recipientMode === 'custom' && selectedStudents.length === 0 && selectedTeachers.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sinh viên hoặc giáo viên');
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await announcementApi.update('global', editingId, title, content);
        toast.success('Đã cập nhật thông báo');
      } else {
        let fileId, fileName, fileUrl;
        if (file) {
          const uploadRes = await driveApi.upload(file, 'global', 'thong_bao');
          fileId = uploadRes.id;
          fileUrl = uploadRes.webViewLink;
          fileName = file.name;
        }

        const maKhoa = recipientMode === 'khoa' ? selectedKhoas : undefined;
        const targetSV = recipientMode === 'custom' && selectedStudents.length > 0 ? selectedStudents : undefined;
        const targetGV = recipientMode === 'custom' && selectedTeachers.length > 0 ? selectedTeachers : undefined;

        await announcementApi.create('global', title, content, fileId, fileName, fileUrl, maKhoa, targetSV, targetGV, recipientMode);
        toast.success('Đã đăng thông báo hệ thống');
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
      await announcementApi.remove('global', id);
      toast.success('Đã xoá thông báo');
      fetchAnnouncements();
    } catch {
      toast.error('Xoá thất bại');
    }
  };

  const toggleList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Prepare items for SearchableCheckList
  const khoaItems = khoaHocs.map(k => ({ id: k.MaKhoa, name: k.TenKhoa, sub: k.MaKhoa }));
  const studentItems = allStudents.map(s => ({ id: s.MaSV, name: s.TenSV, sub: s.MaSV }));
  const teacherItems = allTeachers.map(t => ({ id: t.MaGV, name: t.TenGV, sub: t.MaGV }));

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <HiOutlineBell style={{ color: 'var(--warning-500)' }} /> Thông báo Hệ thống
        </h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <HiOutlinePlus /> Tạo thông báo
          </button>
        )}
      </div>

      {/* ── Create/Edit Form ── */}
      {showForm && (
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
            <>
              <div className="input-group">
                <label>Đính kèm tài liệu</label>
                <input
                  type="file"
                  className="input file-input"
                  onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                  disabled={submitting}
                />
              </div>

              {/* ── Recipient targeting ── */}
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <HiOutlineFunnel /> Đối tượng nhận thông báo
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                  {[
                    { value: 'all' as const, label: 'Tất cả' },
                    { value: 'students' as const, label: 'Tất cả sinh viên' },
                    { value: 'teachers' as const, label: 'Tất cả giáo viên' },
                    { value: 'khoa' as const, label: 'Theo khoá học' },
                    { value: 'custom' as const, label: 'Chọn cụ thể' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-sm)',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        border: `1.5px solid ${recipientMode === opt.value ? 'var(--teams-accent)' : 'var(--border-primary)'}`,
                        background: recipientMode === opt.value ? 'rgba(98,100,167,0.1)' : 'transparent',
                        fontWeight: recipientMode === opt.value ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="recipientMode"
                        checked={recipientMode === opt.value}
                        onChange={() => setRecipientMode(opt.value)}
                        style={{ display: 'none' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {recipientMode === 'khoa' && (
                  <SearchableCheckList
                    label="Khoá học"
                    items={khoaItems}
                    selected={selectedKhoas}
                    onToggle={(id) => toggleList(selectedKhoas, setSelectedKhoas, id)}
                    getId={(k: any) => k.id}
                    getLabel={(k: any) => k.name}
                  />
                )}

                {recipientMode === 'custom' && (
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <SearchableCheckList
                      label="Sinh viên"
                      items={studentItems}
                      selected={selectedStudents}
                      onToggle={(id) => toggleList(selectedStudents, setSelectedStudents, id)}
                      getId={(s: any) => s.id}
                      getLabel={(s: any) => s.name}
                    />
                    <SearchableCheckList
                      label="Giáo viên"
                      items={teacherItems}
                      selected={selectedTeachers}
                      onToggle={(id) => toggleList(selectedTeachers, setSelectedTeachers, id)}
                      getId={(t: any) => t.id}
                      getLabel={(t: any) => t.name}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : editingId ? 'Cập nhật' : 'Đăng thông báo'}
            </button>
          </div>
        </form>
      )}

      {/* ── Announcement History ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <div className="spinner" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <HiOutlineBell style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <h3>Chưa có thông báo hệ thống nào</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Nhấn "Tạo thông báo" để bắt đầu.</p>
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
