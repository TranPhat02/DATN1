/**
 * SinhVienLopMonHocPage — Admin CRUD for Student-ClassSubject junction
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import DataTable, { type TableColumn } from '../../shared/components/DataTable';
import ConfirmModal from '../../shared/components/ConfirmModal';
import { sinhVienLopMonHocApi } from '../../api/sinhVienLopMonHocApi';
import type { SinhVienLopMonHoc } from '../../shared/types';
import { HiOutlineXMark } from 'react-icons/hi2';

const columns: TableColumn<SinhVienLopMonHoc>[] = [
  { key: 'MaSV', label: 'Mã SV', width: '110px' },
  { key: 'TenSV', label: 'Tên sinh viên', render: (v) => (v as string) || '—' },
  { key: 'MaLopMon', label: 'Mã lớp môn', width: '120px' },
  { key: 'TongKet', label: 'Điểm TK', width: '90px', render: (v) => v != null ? String(v) : '—' },
  {
    key: 'KetQua', label: 'Kết quả', width: '100px',
    render: (_v, row) => {
      const score = row?.TongKet != null ? parseFloat(String(row.TongKet)) : NaN;
      if (isNaN(score)) return <span className="badge badge-primary">Chưa có</span>;
      return score >= 4
        ? <span className="badge badge-success">Đạt</span>
        : <span className="badge badge-danger">Trượt</span>;
    }
  },
  { key: 'HocGhep', label: 'Học ghép', width: '90px', render: (v) => (
    <span className={`badge ${v ? 'badge-warning' : 'badge-primary'}`}>{v ? 'Có' : 'Không'}</span>
  )},
];

export default function SinhVienLopMonHocPage() {
  const [data, setData] = useState<SinhVienLopMonHoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<SinhVienLopMonHoc | null>(null);
  const [deleteRow, setDeleteRow] = useState<SinhVienLopMonHoc | null>(null);
  const [formData, setFormData] = useState({ MaSV: '', MaLopMon: '', TongKet: '', HocGhep: 'auto' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await sinhVienLopMonHocApi.getAll();
      setData(result);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditRow(null);
    setFormData({ MaSV: '', MaLopMon: '', TongKet: '', HocGhep: 'auto' });
    setShowModal(true);
  };

  const handleEdit = (row: SinhVienLopMonHoc) => {
    setEditRow(row);
    setFormData({
      MaSV: row.MaSV, MaLopMon: row.MaLopMon,
      TongKet: row.TongKet || '', HocGhep: row.HocGhep ? 'true' : 'false',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        HocGhep: formData.HocGhep === 'auto' ? null : formData.HocGhep === 'true'
      };
      if (editRow) {
        await sinhVienLopMonHocApi.update(editRow.MaSV, editRow.MaLopMon, payload);
        toast.success('Cập nhật thành công!');
      } else {
        await sinhVienLopMonHocApi.create(payload);
        toast.success('Thêm mới thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Thao tác thất bại');
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await sinhVienLopMonHocApi.remove(deleteRow.MaSV, deleteRow.MaLopMon);
      toast.success('Xóa thành công!');
      setDeleteRow(null);
      fetchData();
    } catch { toast.error('Xóa thất bại'); }
  };

  return (
    <div className="page">
      <DataTable
        title="Quản lý SV - Lớp môn học"
        columns={columns}
        data={data}
        rowKey={(row) => `${row.MaSV}_${row.MaLopMon}`}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(row) => setDeleteRow(row)}
      />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editRow ? 'Chỉnh sửa' : 'Thêm mới'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><HiOutlineXMark /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Mã SV <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                <input className="input" value={formData.MaSV} onChange={(e) => setFormData({ ...formData, MaSV: e.target.value })} disabled={!!editRow} />
              </div>
              <div className="input-group">
                <label>Mã lớp môn <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                <input className="input" value={formData.MaLopMon} onChange={(e) => setFormData({ ...formData, MaLopMon: e.target.value })} disabled={!!editRow} />
              </div>
              {editRow && (
                <div className="input-group">
                  <label>Điểm tổng kết</label>
                  <input className="input" value={formData.TongKet} onChange={(e) => setFormData({ ...formData, TongKet: e.target.value })} placeholder="VD: 7.5" />
                </div>
              )}
              <div className="input-group">
                <label>Học ghép</label>
                <select className="input" value={formData.HocGhep} onChange={(e) => setFormData({ ...formData, HocGhep: e.target.value })}>
                  {!editRow && <option value="auto">Tự động phát hiện</option>}
                  <option value="false">Không</option>
                  <option value="true">Có</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editRow ? 'Cập nhật' : 'Thêm'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteRow}
        title="Xóa bản ghi"
        message={`Xóa sinh viên "${deleteRow?.MaSV}" khỏi lớp môn "${deleteRow?.MaLopMon}"?`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  );
}
