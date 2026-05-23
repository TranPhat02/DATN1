/**
 * Teacher DiemMonHocPage — Grade management for a specific class
 * Teachers can view/edit grades, toggle ChoPhepXemDiem
 * Shows ALL enrolled students, even those without grades yet
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { diemMonHocApi } from '../../api/diemMonHocApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { sinhVienLopMonHocApi } from '../../api/sinhVienLopMonHocApi';
import type { DiemMonHoc, SinhVienLopMonHoc } from '../../shared/types';
import { formatScore, exportToCsv } from '../../shared/utils/helpers';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineXMark,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineUsers,
} from 'react-icons/hi2';

interface Props {
  maLopMon: string;
}

interface MergedRow {
  MaDiem: string;
  MaSV: string;
  TenSV?: string;
  DiemGK?: number | null;
  DiemCK?: number | null;
  DiemTK?: number | null;
  DiemH4?: number | null;
  DiemChu?: string | null;
  GhiChu?: string | null;
  hasGrade: boolean;
}

export default function TeacherDiemMonHocPage({ maLopMon }: Props) {
  const [mergedData, setMergedData] = useState<MergedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [choPhepXem, setChoPhepXem] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newData, setNewData] = useState({ MaSV: '', DiemGK: '', DiemCK: '', GhiChu: '' });
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allDiem, enrolledStudents, allLmh] = await Promise.all([
        diemMonHocApi.getAll(),
        sinhVienLopMonHocApi.getByLopMon(maLopMon),
        lopMonHocApi.getAll(),
      ]);

      // Get grades for this class
      const classGrades = allDiem.filter((d: DiemMonHoc) => d.MaLopMon === maLopMon);

      // Merge: show all enrolled students, matched with grades
      const merged: MergedRow[] = enrolledStudents.map((sv: SinhVienLopMonHoc) => {
        const grade = classGrades.find((d: DiemMonHoc) => d.MaSV === sv.MaSV);
        return {
          MaDiem: grade?.MaDiem || '',
          MaSV: sv.MaSV,
          TenSV: sv.TenSV || sv.MaSV,
          DiemGK: grade?.DiemGK ?? null,
          DiemCK: grade?.DiemCK ?? null,
          DiemTK: grade?.DiemTK ?? null,
          DiemH4: grade?.DiemH4 ?? null,
          DiemChu: grade?.DiemChu ?? null,
          GhiChu: grade?.GhiChu ?? null,
          hasGrade: !!grade,
        };
      });

      // Also include grades for students not in enrollment list (edge case)
      classGrades.forEach((d: DiemMonHoc) => {
        if (!merged.find(m => m.MaSV === d.MaSV)) {
          merged.push({
            MaDiem: d.MaDiem,
            MaSV: d.MaSV || '',
            TenSV: d.TenSV,
            DiemGK: d.DiemGK ?? null,
            DiemCK: d.DiemCK ?? null,
            DiemTK: d.DiemTK ?? null,
            DiemH4: d.DiemH4 ?? null,
            DiemChu: d.DiemChu ?? null,
            GhiChu: d.GhiChu ?? null,
            hasGrade: true,
          });
        }
      });

      setMergedData(merged);
      const lmh = allLmh.find((l) => l.MaLopMon === maLopMon);
      if (lmh) setChoPhepXem(lmh.ChoPhepXemDiem);
    } catch {
      toast.error('Không thể tải điểm');
    } finally {
      setLoading(false);
    }
  }, [maLopMon]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSyncStudents = async () => {
    try {
      setSyncing(true);
      await fetchData(); // backend auto-enrolls missing students on getByLopMon call
      toast.success(`Đã đồng bộ! Hiện có ${mergedData.length} sinh viên`);
    } catch {
      toast.error('Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const togglePermission = async () => {
    try {
      await lopMonHocApi.update(maLopMon, { ChoPhepXemDiem: !choPhepXem });
      setChoPhepXem(!choPhepXem);
      toast.success(choPhepXem ? 'Đã tắt xem điểm' : 'Đã mở xem điểm');
    } catch {
      toast.error('Cập nhật quyền thất bại');
    }
  };

  const handleSaveEdit = async (row: MergedRow) => {
    try {
      if (row.hasGrade && row.MaDiem) {
        // Update existing grade
        await diemMonHocApi.update(row.MaDiem, editValues as Record<string, unknown>);
        toast.success('Cập nhật điểm thành công!');
      } else {
        // Create new grade for this student
        await diemMonHocApi.create({
          MaSV: row.MaSV,
          MaLopMon: maLopMon,
          DiemGK: editValues.DiemGK !== undefined ? Number(editValues.DiemGK) : undefined,
          DiemCK: editValues.DiemCK !== undefined ? Number(editValues.DiemCK) : undefined,
          GhiChu: editValues.GhiChu as string | undefined,
        });
        toast.success('Thêm điểm thành công!');
      }
      setEditingRow(null);
      fetchData();
    } catch {
      toast.error('Cập nhật điểm thất bại');
    }
  };

  const handleAdd = async () => {
    try {
      await diemMonHocApi.create({
        MaSV: newData.MaSV,
        MaLopMon: maLopMon,
        DiemGK: newData.DiemGK ? Number(newData.DiemGK) : undefined,
        DiemCK: newData.DiemCK ? Number(newData.DiemCK) : undefined,
        GhiChu: newData.GhiChu || undefined,
      });
      toast.success('Thêm điểm thành công!');
      setShowAdd(false);
      setNewData({ MaSV: '', DiemGK: '', DiemCK: '', GhiChu: '' });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Thêm điểm thất bại');
    }
  };

  const filtered = search
    ? mergedData.filter((d) =>
      d.MaSV.toLowerCase().includes(search.toLowerCase()) ||
      (d.TenSV || '').toLowerCase().includes(search.toLowerCase()) ||
      d.MaDiem.toLowerCase().includes(search.toLowerCase())
    )
    : mergedData;

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Đang tải điểm...</span></div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="search-bar">
            <HiOutlineMagnifyingGlass className="search-icon" />
            <input className="input" placeholder="Tìm mã SV, tên SV..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 'var(--space-10)', width: '200px' }} />
          </div>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>{filtered.length} sinh viên</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            className="btn btn-secondary"
            onClick={handleSyncStudents}
            disabled={syncing}
            title="Đồng bộ danh sách sinh viên trong lớp"
          >
            <HiOutlineArrowPath style={{ animation: syncing ? 'spin 0.6s linear infinite' : 'none' }} />
            <HiOutlineUsers />
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
          </button>
          <button className="btn btn-secondary" onClick={() => {
            exportToCsv(
              `diem_mon_hoc_${maLopMon}.csv`,
              ['STT', 'Mã điểm', 'Mã SV', 'Tên SV', 'Điểm GK', 'Điểm CK', 'Điểm TK', 'Điểm H4', 'Điểm chữ', 'Ghi chú'],
              filtered.map((r, i) => [i + 1, r.MaDiem, r.MaSV, r.TenSV, r.DiemGK, r.DiemCK, r.DiemTK, r.DiemH4, r.DiemChu, r.GhiChu])
            );
          }}>
            <HiOutlineArrowDownTray /> Xuất CSV
          </button>
          <button className={`btn ${choPhepXem ? 'btn-success' : 'btn-danger'}`} onClick={togglePermission}>
            {choPhepXem ? <HiOutlineEye /> : <HiOutlineEyeSlash />}
            {choPhepXem ? 'Đang cho xem' : 'Đang ẩn'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <HiOutlinePlus /> Thêm điểm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã SV</th>
              <th>Tên SV</th>
              <th>Điểm GK</th>
              <th>Điểm CK</th>
              <th>Điểm TK</th>
              <th>Điểm H4</th>
              <th>Điểm chữ</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="empty-cell">Chưa có sinh viên trong lớp</td></tr>
            ) : filtered.map((row, index) => (
              <tr key={row.MaSV} style={{ opacity: row.hasGrade ? 1 : 0.7 }}>
                <td>{index + 1}</td>
                <td>{row.MaSV}</td>
                <td>{row.TenSV || row.MaSV}</td>
                <td>
                  {editingRow === row.MaSV ? (
                    <input className="input" type="number" style={{ width: '70px' }}
                      value={String(editValues.DiemGK ?? row.DiemGK ?? '')}
                      onChange={(e) => setEditValues({ ...editValues, DiemGK: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  ) : formatScore(row.DiemGK)}
                </td>
                <td>
                  {editingRow === row.MaSV ? (
                    <input className="input" type="number" style={{ width: '70px' }}
                      value={String(editValues.DiemCK ?? row.DiemCK ?? '')}
                      onChange={(e) => setEditValues({ ...editValues, DiemCK: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  ) : formatScore(row.DiemCK)}
                </td>
                <td>{formatScore(row.DiemTK)}</td>
                <td>{formatScore(row.DiemH4)}</td>
                <td>{row.DiemChu || '—'}</td>
                <td>
                  {editingRow === row.MaSV ? (
                    <input className="input" type="text" style={{ width: '120px' }}
                      value={String(editValues.GhiChu ?? row.GhiChu ?? '')}
                      onChange={(e) => setEditValues({ ...editValues, GhiChu: e.target.value || undefined })}
                    />
                  ) : (row.GhiChu || '—')}
                </td>
                <td>
                  {editingRow === row.MaSV ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-success btn-sm" onClick={() => handleSaveEdit(row)}>Lưu</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingRow(null)}>Hủy</button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      setEditingRow(row.MaSV);
                      setEditValues({ DiemGK: row.DiemGK, DiemCK: row.DiemCK, GhiChu: row.GhiChu });
                    }}>{row.hasGrade ? 'Sửa' : 'Nhập điểm'}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm điểm</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><HiOutlineXMark /></button>
            </div>
            <div className="modal-body">
              <div className="input-group"><label>Mã SV *</label><input className="input" value={newData.MaSV} onChange={(e) => setNewData({ ...newData, MaSV: e.target.value })} /></div>
              <div className="input-group"><label>Điểm GK</label><input className="input" type="number" value={newData.DiemGK} onChange={(e) => setNewData({ ...newData, DiemGK: e.target.value })} /></div>
              <div className="input-group"><label>Điểm CK</label><input className="input" type="number" value={newData.DiemCK} onChange={(e) => setNewData({ ...newData, DiemCK: e.target.value })} /></div>
              <div className="input-group"><label>Ghi chú</label><input className="input" type="text" value={newData.GhiChu} onChange={(e) => setNewData({ ...newData, GhiChu: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleAdd}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
