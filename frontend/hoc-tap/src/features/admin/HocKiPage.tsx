/**
 * HocKiPage — Admin CRUD for Semesters. Auto-generates MaHocKi.
 */
import { useState, useEffect } from 'react';
import GenericCrudPage, { type FieldConfig } from './GenericCrudPage';
import { hocKiApi } from '../../api/hocKiApi';
import { namHocApi } from '../../api/namHocApi';
import type { HocKi } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';

const initialColumns: TableColumn<HocKi>[] = [
  { key: 'MaHocKi', label: 'Mã HK', width: '100px' },
  { key: 'TenHocKi', label: 'Tên học kì' },
  { key: 'MaNamHoc', label: 'Năm học', width: '150px' },
];

const initialFields: FieldConfig[] = [
  { key: 'MaHocKi', label: 'Mã học kì (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
  { key: 'TenHocKi', label: 'Tên học kì', required: true },
  { key: 'MaNamHoc', label: 'Năm học', type: 'datalist' },
];

export default function HocKiPage() {
  const [fields, setFields] = useState<FieldConfig[]>(initialFields);
  const [cols, setCols] = useState<TableColumn<HocKi>[]>(initialColumns);

  useEffect(() => {
    namHocApi.getAll().then(namhocs => {
      const opts = namhocs.map(nh => ({ value: String(nh.MaNamHoc), label: nh.NamHoc }));
      const nhMap = namhocs.reduce((acc, nh) => { acc[nh.MaNamHoc] = nh.NamHoc; return acc; }, {} as Record<string, string>);

      setCols([
        { key: 'MaHocKi', label: 'Mã HK', width: '100px' },
        { key: 'TenHocKi', label: 'Tên học kì' },
        { key: 'MaNamHoc', label: 'Năm học', width: '150px', render: (v) => nhMap[v as string] || v },
      ]);

      setFields([
        { key: 'MaHocKi', label: 'Mã học kì (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
        { key: 'TenHocKi', label: 'Tên học kì', required: true },
        { key: 'MaNamHoc', label: 'Năm học', type: 'datalist', options: opts },
      ]);
    }).catch(() => {});
  }, []);

  return (
    <GenericCrudPage<HocKi>
      title="Quản lý Học kì"
      columns={cols}
      fields={fields}
      rowKey="MaHocKi"
      api={hocKiApi}
    />
  );
}
