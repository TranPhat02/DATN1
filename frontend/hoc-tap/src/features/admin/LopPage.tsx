/**
 * LopPage — Admin CRUD for Classes. Auto-generates MaLop.
 */
import { useState, useEffect } from 'react';
import GenericCrudPage, { type FieldConfig } from './GenericCrudPage';
import { lopApi } from '../../api/lopApi';
import { khoaHocApi } from '../../api/khoaHocApi';
import type { Lop } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { exportToCsv } from '../../shared/utils/helpers';

const columns: TableColumn<Lop>[] = [
  { key: 'MaLop', label: 'Mã lớp', width: '120px' },
  { key: 'TenLop', label: 'Tên lớp' },
  { key: 'MaKhoa', label: 'Khóa học', width: '120px' },
];

const initialFields: FieldConfig[] = [
  { key: 'MaLop', label: 'Mã lớp', required: true, disabledOnEdit: true },
  { key: 'TenLop', label: 'Tên lớp', required: true },
  { key: 'MaKhoa', label: 'Khóa học', type: 'datalist' },
];

const csvColumns = ['MaLop', 'TenLop', 'MaKhoa'];

export default function LopPage() {
  const [fields, setFields] = useState<FieldConfig[]>(initialFields);
  const [cols, setCols] = useState<TableColumn<Lop>[]>(columns);

  useEffect(() => {
    khoaHocApi.getAll().then(khoas => {
      const opts = khoas.map(k => ({ value: String(k.MaKhoa), label: `${k.MaKhoa} - ${k.TenKhoa}` }));
      const khoaMap = khoas.reduce((acc, k) => { acc[k.MaKhoa] = k.TenKhoa; return acc; }, {} as Record<string, string>);

      setCols([
        { key: 'MaLop', label: 'Mã lớp', width: '120px' },
        { key: 'TenLop', label: 'Tên lớp' },
        { key: 'MaKhoa', label: 'Khóa học', width: '150px', render: (v) => { const n = khoaMap[v as string]; return n ? `${v} - ${n}` : v; } },
      ]);

      setFields([
        { key: 'MaLop', label: 'Mã lớp', required: true, disabledOnEdit: true },
        { key: 'TenLop', label: 'Tên lớp', required: true },
        { key: 'MaKhoa', label: 'Khóa học', type: 'datalist', options: opts },
      ]);
    }).catch(() => {});
  }, []);

  const handleExportCsv = (data: Lop[]) => {
    const headers = ['Mã lớp', 'Tên lớp', 'Khóa học'];
    const rows = data.map(lop => [lop.MaLop, lop.TenLop, lop.MaKhoa]);
    exportToCsv('Lop.csv', headers, rows);
  };

  return (
    <GenericCrudPage<Lop>
      title="Quản lý Lớp"
      columns={cols}
      fields={fields}
      rowKey="MaLop"
      api={lopApi}
      csvColumns={csvColumns}
      onExportCsv={handleExportCsv}
    />
  );
}
