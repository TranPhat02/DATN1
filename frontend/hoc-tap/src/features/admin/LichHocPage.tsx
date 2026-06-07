/**
 * LichHocPage — Admin schedule CRUD + Gantt view
 * Features: CSV import/export, auto-generate from LopMonHoc
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { lichHocApi } from '../../api/lichHocApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { hocKiApi } from '../../api/hocKiApi';
import { namHocApi } from '../../api/namHocApi';
import DataTable, { type TableColumn } from '../../shared/components/DataTable';
import ConfirmModal from '../../shared/components/ConfirmModal';
import GanttSchedule from '../../shared/components/GanttSchedule';
import CsvImportModal from '../../shared/components/CsvImportModal';
import type { LopMonHoc, HocKi, NamHoc } from '../../shared/types';
import { exportToCsv } from '../../shared/utils/helpers';
import {
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
} from 'react-icons/hi2';

/* eslint-disable @typescript-eslint/no-explicit-any */
type LichHocRow = Record<string, unknown>;

const columns: TableColumn<LichHocRow>[] = [
  { key: 'MaLich', label: 'Mã lịch', width: '100px' },
  { key: 'MaLopMon', label: 'Mã lớp môn', width: '110px' },
  { key: 'TenMH', label: 'Môn học', render: (v) => (v as string) || '—' },
  { key: 'Thu', label: 'Thứ', width: '80px' },
  { key: 'Ca', label: 'Ca', width: '70px' },
  { key: 'PhongHoc', label: 'Phòng', width: '80px' },
  { key: 'NgayBatDau', label: 'Bắt đầu', width: '110px', render: (v) => v ? new Date(v as string).toLocaleDateString('vi-VN') : '—' },
  { key: 'NgayKetThuc', label: 'Kết thúc', width: '110px', render: (v) => v ? new Date(v as string).toLocaleDateString('vi-VN') : '—' },
];

export default function LichHocPage() {
  const [data, setData] = useState<LichHocRow[]>([]);
  const [lopMons, setLopMons] = useState<LopMonHoc[]>([]);
  const [namHocs, setNamHocs] = useState<NamHoc[]>([]);
  const [hocKis, setHocKis] = useState<HocKi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<LichHocRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<LichHocRow | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

  const [selectedNamHoc, setSelectedNamHoc] = useState<string>('');
  const [selectedHocKi, setSelectedHocKi] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lh, lm, hk, nh] = await Promise.all([
        lichHocApi.getAll(),
        lopMonHocApi.getAll(),
        hocKiApi.getAll(),
        namHocApi.getAll(),
      ]);

      const lmMkMap = new Map<string, string>();
      lm.forEach((l) => lmMkMap.set(l.MaLopMon, l.MaHocKi || ''));

      const hkNhMap = new Map<string, string>();
      hk.forEach((h) => hkNhMap.set(h.MaHocKi, h.MaNamHoc || ''));

      const enrichedLh = (lh as any[]).map(l => {
        const maHk = lmMkMap.get(l.MaLopMon || '') || '';
        const maNh = hkNhMap.get(maHk) || '';
        return { ...l, MaHocKi: maHk, MaNamHoc: maNh };
      });

      setData(enrichedLh);
      setLopMons(lm);
      setHocKis(hk);
      setNamHocs(nh);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditRow(null);
    setFormData({ MaLopMon: '', Thu: '', Ca: '', PhongHoc: '', NgayBatDau: '', NgayKetThuc: '' });
    setShowModal(true);
  };

  const handleEdit = (row: LichHocRow) => {
    setEditRow(row);
    setFormData({
      MaLopMon: String(row.MaLopMon || ''),
      Thu: String(row.Thu || ''),
      Ca: String(row.Ca || ''),
      PhongHoc: String(row.PhongHoc || ''),
      NgayBatDau: String(row.NgayBatDau || ''),
      NgayKetThuc: String(row.NgayKetThuc || ''),
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.MaLopMon) { toast.error('Vui lòng chọn lớp môn học'); return; }
    setSubmitting(true);
    try {
      if (editRow) {
        await lichHocApi.update(String(editRow.MaLich), formData);
        toast.success('Cập nhật lịch thành công!');
      } else {
        await lichHocApi.create(formData as any);
        toast.success('Thêm lịch học thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Thao tác thất bại');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await lichHocApi.remove(String(deleteRow.MaLich));
      toast.success('Xóa thành công!');
      setDeleteRow(null);
      fetchData();
    } catch { toast.error('Xóa thất bại'); }
  };

  /** Xuất CSV */
  const handleExportCsv = () => {
    const rows = filteredData.map(r => [
      r.MaLich, r.MaLopMon, r.TenMH || '', r.Thu, r.Ca, r.PhongHoc,
      r.NgayBatDau ? new Date(r.NgayBatDau as string).toLocaleDateString('vi-VN') : '',
      r.NgayKetThuc ? new Date(r.NgayKetThuc as string).toLocaleDateString('vi-VN') : '',
    ]);
    exportToCsv('LichHoc.csv',
      ['MaLich', 'MaLopMon', 'TenMH', 'Thu', 'Ca', 'PhongHoc', 'NgayBatDau', 'NgayKetThuc'],
      rows
    );
    toast.success(`Đã xuất ${rows.length} dòng`);
  };

  /** Import CSV */
  const handleImportCsvFile = async (file: File) => {
    setImporting(true);
    try {
      const result = await lichHocApi.importCsv(file);
      toast.success(result.message);
      setShowCsv(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };


  const filteredHocKis = useMemo(() => {
    if (!selectedNamHoc) return hocKis;
    return hocKis.filter(hk => hk.MaNamHoc === selectedNamHoc);
  }, [hocKis, selectedNamHoc]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedNamHoc) result = result.filter(r => (r as any).MaNamHoc === selectedNamHoc);
    if (selectedHocKi) result = result.filter(r => (r as any).MaHocKi === selectedHocKi);
    return result;
  }, [data, selectedNamHoc, selectedHocKi]);

  return (
    <div className="page animate-fade-in">
      {/* ── Toolbar above table ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowCsv(true)}
          disabled={importing}
          title="Import lịch học từ file CSV (MaLopMon;Thu;Ca;PhongHoc;NgayBatDau;NgayKetThuc)"
        >
          <HiOutlineArrowUpTray />
          {importing ? 'Đang import...' : 'Import CSV'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleExportCsv}
          title="Xuất lịch học ra file CSV"
        >
          <HiOutlineArrowDownTray /> Xuất CSV
        </button>
      </div>

      <DataTable
        title="Quản lý Lịch học"
        columns={columns}
        data={filteredData}
        rowKey="MaLich"
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(row) => setDeleteRow(row)}
      />

      {/* Gantt view */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="text-teams-panel-text-active font-semibold flex items-center gap-2 m-0">
            <HiOutlineCalendarDays className="text-teams-accent text-xl" />
            Thời khóa biểu
          </h3>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: '500' }}>Lọc theo:</label>
            <select
              className="input"
              style={{ width: '180px' }}
              value={selectedNamHoc}
              onChange={(e) => { setSelectedNamHoc(e.target.value); setSelectedHocKi(''); }}
            >
              <option value="">-- Tất cả Năm học --</option>
              {namHocs.map(nh => <option key={nh.MaNamHoc} value={nh.MaNamHoc}>{nh.NamHoc}</option>)}
            </select>
            <select
              className="input"
              style={{ width: '180px' }}
              value={selectedHocKi}
              onChange={(e) => setSelectedHocKi(e.target.value)}
            >
              <option value="">-- Tất cả Học kì --</option>
              {filteredHocKis.map(hk => <option key={hk.MaHocKi} value={hk.MaHocKi}>{hk.TenHocKi}</option>)}
            </select>
          </div>
        </div>
        <GanttSchedule data={filteredData as any} loading={loading} />
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editRow ? 'Sửa lịch học' : 'Thêm lịch học'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><HiOutlineXMark /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Lớp môn học <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                <input
                  className="input"
                  list="datalist-MaLopMon"
                  placeholder="Nhập hoặc chọn mã lớp môn..."
                  value={formData.MaLopMon}
                  onChange={(e) => setFormData({ ...formData, MaLopMon: e.target.value })}
                />
                <datalist id="datalist-MaLopMon">
                  {lopMons.map((lm) => (
                    <option key={lm.MaLopMon} value={lm.MaLopMon}>
                      {lm.MaLopMon} {lm.TenLopMon ? `- ${lm.TenLopMon}` : lm.TenMH ? `- ${lm.TenMH}` : ''}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="input-group">
                <label>Thứ</label>
                <select className="input" value={formData.Thu} onChange={(e) => setFormData({ ...formData, Thu: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div className="input-group">
                <label>Ca</label>
                <select className="input" value={formData.Ca} onChange={(e) => setFormData({ ...formData, Ca: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4'].map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div className="input-group">
                <label>Phòng học</label>
                <input className="input" value={formData.PhongHoc} onChange={(e) => setFormData({ ...formData, PhongHoc: e.target.value })} placeholder="VD: A301" />
              </div>
              <div className="input-group">
                <label>Ngày bắt đầu</label>
                <input className="input" type="date" value={formData.NgayBatDau} onChange={(e) => setFormData({ ...formData, NgayBatDau: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Ngày kết thúc</label>
                <input className="input" type="date" value={formData.NgayKetThuc} onChange={(e) => setFormData({ ...formData, NgayKetThuc: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Đang lưu...' : (editRow ? 'Cập nhật' : 'Thêm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteRow} title="Xóa lịch học" message={`Xóa lịch "${deleteRow?.MaLich}"?`} confirmLabel="Xóa" onConfirm={handleDelete} onCancel={() => setDeleteRow(null)} />

      {/* CSV import hint */}
      <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
        💡 <strong>Định dạng CSV import:</strong> cột bắt buộc <code>MaLopMon</code>, tùy chọn: <code>Thu</code> · <code>Ca</code> · <code>PhongHoc</code> · <code>NgayBatDau</code> · <code>NgayKetThuc</code> (DD/MM/YYYY hoặc YYYY-MM-DD). Dấu phân cách: dấu chấm phẩy hoặc dấu phẩy.
      </div>

      <CsvImportModal
        open={showCsv}
        title="Import Lịch học"
        onClose={() => setShowCsv(false)}
        onImportFile={handleImportCsvFile}
        expectedColumns={['MaLopMon']}
      />
    </div>
  );
}
