/**
 * MonHocPage — Admin CRUD for Subjects
 * Auto-generates MaMH. Creates Google Drive folder on add.
 */
import GenericCrudPage from './GenericCrudPage';
import { monHocApi } from '../../api/monHocApi';
import type { MonHoc } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';

const columns: TableColumn<MonHoc>[] = [
  { key: 'MaMH', label: 'Mã MH', width: '100px' },
  { key: 'TenMH', label: 'Tên môn học' },
  { key: 'SoTinChi', label: 'Số tín chỉ', width: '100px' },
];

const fields = [
  { key: 'MaMH', label: 'Mã MH (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
  { key: 'TenMH', label: 'Tên môn học', required: true },
  { key: 'SoTinChi', label: 'Số tín chỉ', type: 'number' as const, required: true },
];

export default function MonHocPage() {
  return (
    <GenericCrudPage<MonHoc>
      title="Quản lý Môn học"
      columns={columns}
      fields={fields}
      rowKey="MaMH"
      api={monHocApi}
    />
  );
}
