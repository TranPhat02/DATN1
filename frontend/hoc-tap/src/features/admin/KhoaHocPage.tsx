/**
 * KhoaHocPage — Admin CRUD for KhoaHoc.
 */
import GenericCrudPage from './GenericCrudPage';
import { khoaHocApi } from '../../api/khoaHocApi';
import type { KhoaHoc } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';

const columns: TableColumn<KhoaHoc>[] = [
  { key: 'MaKhoa', label: 'Mã khoá học', width: '120px' },
  { key: 'TenKhoa', label: 'Tên khoá học' },
];

const fields = [
  { key: 'MaKhoa', label: 'Mã khoá học', required: true, disabledOnEdit: true },
  { key: 'TenKhoa', label: 'Tên khoá học', required: true },
];

export default function KhoaHocPage() {
  return (
    <GenericCrudPage<KhoaHoc>
      title="Quản lý Khoá học"
      columns={columns}
      fields={fields}
      rowKey="MaKhoa"
      api={khoaHocApi}
    />
  );
}
