/**
 * SinhVienPage — Admin CRUD for Students (with CSV import)
 * Auto-creates TaiKhoan when adding (username=MaSV, pw=123456789)
 */
import { useState, useEffect } from 'react';
import GenericCrudPage, { type FieldConfig } from './GenericCrudPage';
import { sinhVienApi } from '../../api/sinhVienApi';
import { khoaHocApi } from '../../api/khoaHocApi';
import { lopApi } from '../../api/lopApi';
import type { SinhVien } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { formatDate, exportToCsv } from '../../shared/utils/helpers';

const columns: TableColumn<SinhVien>[] = [
  { key: 'MaSV', label: 'Mã SV', width: '100px' },
  { key: 'TenSV', label: 'Tên sinh viên' },
  { key: 'GioiTinh', label: 'Giới tính', width: '90px' },
  { key: 'NgaySinh', label: 'Ngày sinh', width: '110px', render: (v) => formatDate(v as string) },
  { key: 'DiaChi', label: 'Địa chỉ' },
  { key: 'MaLop', label: 'Mã lớp', width: '90px' },
  { key: 'MaKhoa', label: 'Khóa học', width: '90px' },
  { key: 'Gmail', label: 'Gmail' },
];

const initialFields: FieldConfig[] = [
  { key: 'MaSV', label: 'Mã SV (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
  { key: 'TenSV', label: 'Tên sinh viên', required: true },
  { key: 'GioiTinh', label: 'Giới tính', type: 'select', options: [
    { value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' },
  ]},
  { key: 'NgaySinh', label: 'Ngày sinh', type: 'date' },
  { key: 'DiaChi', label: 'Địa chỉ' },
  { key: 'MaLop', label: 'Mã lớp', type: 'datalist' },
  { key: 'MaKhoa', label: 'Khóa học', type: 'datalist' },
  { key: 'Gmail', label: 'Gmail (dùng để nhận thông báo)', placeholder: 'example@gmail.com' },
];

const csvColumns = ['TenSV', 'GioiTinh', 'NgaySinh', 'DiaChi', 'MaLop', 'MaKhoa', 'Gmail'];

export default function SinhVienPage() {
  const [fields, setFields] = useState<FieldConfig[]>(initialFields);
  const [cols, setCols] = useState<TableColumn<SinhVien>[]>(columns);

  useEffect(() => {
    Promise.all([khoaHocApi.getAll(), lopApi.getAll()]).then(([khoas, lops]) => {
      const khoaOpts = khoas.map(k => ({ value: String(k.MaKhoa), label: `${k.MaKhoa} - ${k.TenKhoa}` }));
      const khoaMap = khoas.reduce((acc, k) => { acc[k.MaKhoa] = k.TenKhoa; return acc; }, {} as Record<string, string>);

      const lopOpts = lops.map(l => ({ value: String(l.MaLop), label: `${l.MaLop} - ${l.TenLop}` }));

      setCols([
        { key: 'MaSV', label: 'Mã SV', width: '100px' },
        { key: 'TenSV', label: 'Tên sinh viên' },
        { key: 'GioiTinh', label: 'Giới tính', width: '90px' },
        { key: 'NgaySinh', label: 'Ngày sinh', width: '110px', render: (v) => formatDate(v as string) },
        { key: 'DiaChi', label: 'Địa chỉ' },
        { key: 'MaLop', label: 'Mã lớp', width: '90px' },
        { key: 'MaKhoa', label: 'Khóa học', width: '150px', render: (v) => { const n = khoaMap[v as string]; return n ? `${v} - ${n}` : v; } },
        { key: 'Gmail', label: 'Gmail' },
      ]);

      setFields([
        { key: 'MaSV', label: 'Mã SV (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
        { key: 'TenSV', label: 'Tên sinh viên', required: true },
        { key: 'GioiTinh', label: 'Giới tính', type: 'select', options: [
          { value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' },
        ]},
        { key: 'NgaySinh', label: 'Ngày sinh', type: 'date' },
        { key: 'DiaChi', label: 'Địa chỉ' },
        { key: 'MaLop', label: 'Mã lớp', type: 'datalist', options: lopOpts },
        { key: 'MaKhoa', label: 'Khóa học', type: 'datalist', options: khoaOpts },
        { key: 'Gmail', label: 'Gmail (dùng để nhận thông báo)', placeholder: 'example@gmail.com' },
      ]);
    }).catch(() => {});
  }, []);
  const handleExportCsv = (data: SinhVien[]) => {
    const headers = ['Mã SV', 'Tên sinh viên', 'Giới tính', 'Ngày sinh', 'Địa chỉ', 'Mã lớp', 'Mã khóa', 'Gmail'];
    const rows = data.map(sv => [
      sv.MaSV, sv.TenSV, sv.GioiTinh, sv.NgaySinh ? formatDate(sv.NgaySinh as string) : '', sv.DiaChi, sv.MaLop, sv.MaKhoa, sv.Gmail
    ]);
    exportToCsv('SinhVien.csv', headers, rows);
  };

  return (
    <GenericCrudPage<SinhVien>
      title="Quản lý Sinh viên"
      columns={cols}
      fields={fields}
      rowKey="MaSV"
      api={sinhVienApi}
      csvColumns={csvColumns}
      onExportCsv={handleExportCsv}
    />
  );
}
