/**
 * GenericCrudPage — Reusable admin CRUD page
 * Provides DataTable + Add/Edit modal + Delete confirm for any entity.
 */
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import DataTable, { type TableColumn } from '../../shared/components/DataTable';
import ConfirmModal from '../../shared/components/ConfirmModal';
import CsvImportModal from '../../shared/components/CsvImportModal';
import { HiOutlineXMark } from 'react-icons/hi2';

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'password' | 'datalist';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  disabledOnEdit?: boolean;
  hiddenOnAdd?: boolean;
}

interface GenericCrudPageProps<T extends Record<string, unknown>> {
  title: string;
  columns: TableColumn<T>[];
  fields: FieldConfig[];
  rowKey: string;
  api: {
    getAll: () => Promise<T[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (data: any) => Promise<T>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (id: string, data: any) => Promise<T>;
    remove: (id: string) => Promise<void>;
  };
  csvColumns?: string[];
  onCsvImport?: (data: Record<string, string>[]) => Promise<void>;
  extraActions?: (row: T) => ReactNode;
  transformBeforeSubmit?: (data: Record<string, unknown>, isEdit: boolean) => Record<string, unknown>;
  onExportCsv?: (data: T[]) => void;
}

export default function GenericCrudPage<T extends Record<string, unknown>>({
  title,
  columns,
  fields,
  rowKey,
  api,
  csvColumns,
  onCsvImport,
  extraActions,
  transformBeforeSubmit,
  onExportCsv,
}: GenericCrudPageProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<T | null>(null);
  const [deleteRow, setDeleteRow] = useState<T | null>(null);
  const [showCsv, setShowCsv] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getAll();
      setData(result);
    } catch (err) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditRow(null);
    const defaults: Record<string, unknown> = {};
    fields.forEach((f) => {
      defaults[f.key] = f.type === 'number' ? 0 : '';
    });
    setFormData(defaults);
    setShowModal(true);
  };

  const handleEdit = (row: T) => {
    setEditRow(row);
    const vals: Record<string, unknown> = {};
    fields.forEach((f) => {
      vals[f.key] = row[f.key] ?? '';
    });
    setFormData(vals);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    // Validate required fields
    for (const f of fields) {
      if (f.required && !formData[f.key] && formData[f.key] !== 0) {
        toast.error(`Vui lòng nhập ${f.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      let payload = { ...formData };
      if (transformBeforeSubmit) {
        payload = transformBeforeSubmit(payload, !!editRow);
      }

      if (editRow) {
        await api.update(String(editRow[rowKey]), payload);
        toast.success('Cập nhật thành công!');
      } else {
        await api.create(payload);
        toast.success('Thêm mới thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await api.remove(String(deleteRow[rowKey]));
      toast.success('Xóa thành công!');
      setDeleteRow(null);
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Xóa thất bại');
    }
  };

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    try {
      if (onCsvImport) {
        await onCsvImport(rows);
      } else {
        // Default: create each row via API
        let success = 0;
        for (const row of rows) {
          try {
            const payload: Record<string, unknown> = { ...row };
            Object.keys(payload).forEach(key => {
              if (payload[key] === '') {
                payload[key] = null;
              } else if (typeof payload[key] === 'string' && (payload[key] as string).match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const str = payload[key] as string;
                const parts = str.split('/');
                payload[key] = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            });
            await api.create(payload);
            success++;
          } catch { /* skip failed rows */ }
        }
        toast.success(`Import thành công ${success}/${rows.length} bản ghi`);
      }
      setShowCsv(false);
      fetchData();
    } catch {
      toast.error('Import thất bại');
    }
  };

  return (
    <div className="page">
      <DataTable
        title={title}
        columns={columns}
        data={data}
        rowKey={rowKey}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(row) => setDeleteRow(row)}
        onImportCsv={csvColumns ? () => setShowCsv(true) : undefined}
        onExportCsv={onExportCsv ? () => onExportCsv(data) : undefined}
        actions={extraActions}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => e.preventDefault()} autoComplete="off">
            <div className="modal-header">
              <h3 className="modal-title">{editRow ? 'Chỉnh sửa' : 'Thêm mới'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} type="button">
                <HiOutlineXMark />
              </button>
            </div>
            <div className="modal-body">
              {fields.filter((f) => !(f.hiddenOnAdd && !editRow)).map((f) => (
                <div key={f.key} className="input-group">
                  <label>{f.label} {f.required && <span style={{ color: 'var(--danger-400)' }}>*</span>}</label>
                  {f.type === 'select' ? (
                    <select
                      className="input"
                      value={String(formData[f.key] ?? '')}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      disabled={f.disabled || (!!editRow && f.disabledOnEdit)}
                    >
                      <option value="">-- Chọn --</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === 'datalist' ? (
                    <>
                      <input
                        className="input"
                        list={`datalist-${f.key}`}
                        placeholder={f.placeholder || f.label}
                        value={String(formData[f.key] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                        disabled={f.disabled || (!!editRow && f.disabledOnEdit)}
                        autoComplete="off"
                      />
                      <datalist id={`datalist-${f.key}`}>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <input
                      className="input"
                      type={f.type || 'text'}
                      placeholder={f.placeholder || f.label}
                      value={String(formData[f.key] ?? '')}
                      onChange={(e) => setFormData({
                        ...formData,
                        [f.key]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
                      })}
                      disabled={f.disabled || (editRow ? f.disabledOnEdit : false)}
                      autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Hủy</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} type="submit">
                {submitting ? 'Đang lưu...' : (editRow ? 'Cập nhật' : 'Thêm')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteRow}
        title="Xóa bản ghi"
        message={`Bạn có chắc muốn xóa "${deleteRow ? deleteRow[rowKey] : ''}"? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteRow(null)}
      />

      {/* CSV Import */}
      {csvColumns && (
        <CsvImportModal
          open={showCsv}
          title={`Import ${title}`}
          onClose={() => setShowCsv(false)}
          onImport={handleCsvImport}
          expectedColumns={csvColumns}
        />
      )}
    </div>
  );
}
