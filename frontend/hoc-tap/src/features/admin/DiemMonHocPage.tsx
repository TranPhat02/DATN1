/**
 * DiemMonHocPage — Admin CRUD for Subject Grades (auto-gen MaDiem)
 */
import GenericCrudPage from './GenericCrudPage';
import { diemMonHocApi } from '../../api/diemMonHocApi';
import type { DiemMonHoc } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { formatScore, exportToCsv } from '../../shared/utils/helpers';

const columns: TableColumn<DiemMonHoc>[] = [
  { key: 'MaDiem', label: 'Mã điểm', width: '100px' },
  { key: 'MaSV', label: 'Mã SV', width: '90px' },
  { key: 'MaLopMon', label: 'Mã LM', width: '100px' },
  { key: 'TenMH', label: 'Môn học', width: '150px' },
  { key: 'DiemGK', label: 'Điểm GK', width: '80px', render: (v) => formatScore(v as number) },
  { key: 'DiemCK', label: 'Điểm CK', width: '80px', render: (v) => formatScore(v as number) },
  { key: 'DiemTK', label: 'Điểm TK', width: '80px', render: (v) => formatScore(v as number) },
  { key: 'DiemH4', label: 'Điểm H4', width: '80px', render: (v) => formatScore(v as number) },
  { key: 'DiemChu', label: 'Điểm chữ', width: '80px' },
];

const fields = [
  // MaDiem is auto-generated, not shown in add form
  { key: 'TenSV', label: 'Tên sinh viên', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'TenKhoa', label: 'Tên khoá học', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'TenLop', label: 'Tên lớp học', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'MaSV', label: 'Mã sinh viên', required: true },
  { key: 'MaLopMon', label: 'Mã lớp môn', required: true },
  { key: 'DiemGK', label: 'Điểm GK', type: 'number' as const },
  { key: 'DiemCK', label: 'Điểm CK', type: 'number' as const },
];

export default function DiemMonHocPage() {
  return (
    <GenericCrudPage<DiemMonHoc>
      title="Quản lý Điểm môn học"
      columns={columns}
      fields={fields}
      rowKey="MaDiem"
      api={diemMonHocApi}
      onExportCsv={(data) => {
        exportToCsv(
          'diem_mon_hoc.csv',
          ['Mã điểm', 'Mã SV', 'Mã lớp môn', 'Môn học', 'Điểm GK', 'Điểm CK', 'Điểm TK', 'Điểm H4', 'Điểm chữ'],
          data.map(r => [r.MaDiem, r.MaSV, r.MaLopMon, r.TenMH, r.DiemGK, r.DiemCK, r.DiemTK, r.DiemH4, r.DiemChu])
        );
      }}
    />
  );
}
