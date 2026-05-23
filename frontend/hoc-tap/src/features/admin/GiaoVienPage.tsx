/**
 * GiaoVienPage — Admin CRUD for Teachers (with CSV import)
 * Auto-creates TaiKhoan when adding (username=MaGV, pw=123456789)
 */
import GenericCrudPage from './GenericCrudPage';
import { giaoVienApi } from '../../api/giaoVienApi';
import type { GiaoVien } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { formatDate, exportToCsv } from '../../shared/utils/helpers';

const columns: TableColumn<GiaoVien>[] = [
  { key: 'MaGV', label: 'Mã GV', width: '100px' },
  { key: 'TenGV', label: 'Tên giáo viên' },
  { key: 'GioiTinh', label: 'Giới tính', width: '90px' },
  { key: 'NgaySinh', label: 'Ngày sinh', width: '110px', render: (v) => formatDate(v as string) },
  { key: 'DiaChi', label: 'Địa chỉ' },
  { key: 'Gmail', label: 'Gmail' },
];

const fields = [
  { key: 'MaGV', label: 'Mã GV (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
  { key: 'TenGV', label: 'Tên giáo viên', required: true },
  { key: 'GioiTinh', label: 'Giới tính', type: 'select' as const, options: [
    { value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' },
  ]},
  { key: 'NgaySinh', label: 'Ngày sinh', type: 'date' as const },
  { key: 'DiaChi', label: 'Địa chỉ' },
  { key: 'Gmail', label: 'Gmail (dùng để nhận thông báo)', placeholder: 'example@gmail.com' },
];

const csvColumns = ['MaGV', 'TenGV', 'GioiTinh', 'NgaySinh', 'DiaChi', 'Gmail'];

export default function GiaoVienPage() {
  const handleExportCsv = (data: GiaoVien[]) => {
    const headers = ['Mã GV', 'Tên giáo viên', 'Giới tính', 'Ngày sinh', 'Địa chỉ', 'Gmail'];
    const rows = data.map(gv => [
      gv.MaGV, gv.TenGV, gv.GioiTinh, gv.NgaySinh ? formatDate(gv.NgaySinh as string) : '', gv.DiaChi, gv.Gmail
    ]);
    exportToCsv('GiaoVien.csv', headers, rows);
  };

  return (
    <GenericCrudPage<GiaoVien>
      title="Quản lý Giáo viên"
      columns={columns}
      fields={fields}
      rowKey="MaGV"
      api={giaoVienApi}
      csvColumns={csvColumns}
      onExportCsv={handleExportCsv}
    />
  );
}
