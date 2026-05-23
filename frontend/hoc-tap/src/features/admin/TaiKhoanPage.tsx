/**
 * TaiKhoanPage — Admin CRUD for Accounts (with email sending)
 */
import GenericCrudPage from './GenericCrudPage';
import { taiKhoanApi } from '../../api/taiKhoanApi';
import type { TaiKhoan } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { getRoleLabel } from '../../shared/utils/helpers';

const columns: TableColumn<TaiKhoan>[] = [
  { key: 'UserName', label: 'Tên đăng nhập' },
  { key: 'Role', label: 'Vai trò', width: '130px', render: (v) => (
    <span className={`badge ${v === 'admin' ? 'badge-danger' : v === 'teacher' ? 'badge-primary' : 'badge-success'}`}>
      {getRoleLabel(v as string)}
    </span>
  )},
];

const fields = [
  { key: 'UserName', label: 'Tên đăng nhập', required: true, disabledOnEdit: true },
  { key: 'Password', label: 'Mật khẩu', type: 'password' as const, required: true },
  { key: 'Role', label: 'Vai trò', type: 'select' as const, required: true, options: [
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'teacher', label: 'Giáo viên' },
    { value: 'student', label: 'Sinh viên' },
  ]},
];

export default function TaiKhoanPage() {
  return (
    <GenericCrudPage<TaiKhoan>
      title="Quản lý Tài khoản"
      columns={columns}
      fields={fields}
      rowKey="UserName"
      api={taiKhoanApi}
    />
  );
}
