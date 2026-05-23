/**
 * DiemTracNghiemPage — Admin CRUD for Quiz Grades
 */
import GenericCrudPage from './GenericCrudPage';
import { diemTracNghiemApi } from '../../api/diemTracNghiemApi';
import type { DiemTracNghiem } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { exportToCsv } from '../../shared/utils/helpers';

const columns: TableColumn<DiemTracNghiem>[] = [
  { key: 'MaTN', label: 'Mã TN', width: '100px' },
  { key: 'MaSV', label: 'Mã SV', width: '90px' },
  { key: 'MaLopMon', label: 'Mã LM', width: '100px' },
  { key: 'SoCauDung', label: 'Số câu đúng', width: '100px' },
  { key: 'TongSoCau', label: 'Tổng số câu', width: '100px' },
  { key: 'SoLanViPham', label: 'Vi phạm', width: '100px', render: (v) => v || 0 },
  { key: 'ThoiGianLam', label: 'TG làm (s)', width: '90px' },
  { key: 'ThoiGianNop', label: 'TG nộp', width: '150px', render: (v) => v ? new Date(v as string).toLocaleString('vi-VN') : '—' },
  { key: 'FileID', label: 'File ID' },
];

const fields = [
  // MaTN auto-generated
  { key: 'TenSV', label: 'Tên sinh viên', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'TenKhoa', label: 'Tên khoá học', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'TenLop', label: 'Tên lớp học', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'TenMH', label: 'Tên môn học', disabled: true, disabledOnEdit: true, hiddenOnAdd: true },
  { key: 'MaSV', label: 'Mã sinh viên', required: true },
  { key: 'MaLopMon', label: 'Mã lớp môn', required: true },
  { key: 'SoCauDung', label: 'Số câu đúng', type: 'number' as const },
  { key: 'TongSoCau', label: 'Tổng số câu', type: 'number' as const },
  { key: 'FileID', label: 'File ID' },
];

export default function DiemTracNghiemPage() {
  return (
    <GenericCrudPage<DiemTracNghiem>
      title="Quản lý Điểm trắc nghiệm"
      columns={columns}
      fields={fields}
      rowKey="MaTN"
      api={diemTracNghiemApi}
      onExportCsv={(data) => {
        exportToCsv(
          'diem_trac_nghiem.csv',
          ['Mã TN', 'Mã SV', 'Mã LM', 'Số câu đúng', 'Tổng số câu', 'Vi phạm', 'TG làm (s)', 'TG nộp', 'File ID'],
          data.map(r => [r.MaTN, r.MaSV, r.MaLopMon, r.SoCauDung, r.TongSoCau, r.SoLanViPham || 0, r.ThoiGianLam, r.ThoiGianNop ? new Date(r.ThoiGianNop).toLocaleString('vi-VN') : '', r.FileID])
        );
      }}
    />
  );
}
