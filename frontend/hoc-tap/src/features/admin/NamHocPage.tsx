/**
 * NamHocPage — Admin CRUD for Academic Years. Auto-generates MaNamHoc.
 */
import GenericCrudPage from './GenericCrudPage';
import { namHocApi } from '../../api/namHocApi';
import type { NamHoc } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';

const columns: TableColumn<NamHoc>[] = [
  { key: 'MaNamHoc', label: 'Mã năm học', width: '120px' },
  { key: 'NamHoc', label: 'Năm học' },
];

const fields = [
  { key: 'MaNamHoc', label: 'Mã năm học (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
  { key: 'NamHoc', label: 'Năm học', required: true },
];

export default function NamHocPage() {
  return (
    <GenericCrudPage<NamHoc>
      title="Quản lý Năm học"
      columns={columns}
      fields={fields}
      rowKey="MaNamHoc"
      api={namHocApi}
    />
  );
}
