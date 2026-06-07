import { useState, useEffect } from 'react';
import GenericCrudPage, { type FieldConfig } from './GenericCrudPage';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { lopApi } from '../../api/lopApi';
import { monHocApi } from '../../api/monHocApi';
import { giaoVienApi } from '../../api/giaoVienApi';
import { hocKiApi } from '../../api/hocKiApi';
import { namHocApi } from '../../api/namHocApi';
import type { LopMonHoc } from '../../shared/types';
import type { TableColumn } from '../../shared/components/DataTable';
import { exportToCsv } from '../../shared/utils/helpers';

const initialColumns: TableColumn<LopMonHoc>[] = [
  { key: 'MaLopMon', label: 'Mã LM', width: '110px' },
  { key: 'TenLopMon', label: 'Tên lớp môn', render: (v) => (v as string) || '—' },
  { key: 'MaMH', label: 'Môn học', width: '160px' },
  { key: 'MaLop', label: 'Lớp', width: '90px' },
  { key: 'MaGV', label: 'Giáo viên', width: '90px' },
  { key: 'MaHocKi', label: 'Học kỳ', width: '90px' },
  { key: 'ChoPhepXemDiem', label: 'Xem điểm', width: '90px', render: (v) => (
    <span className={`badge ${v ? 'badge-success' : 'badge-danger'}`}>{v ? 'Có' : 'Không'}</span>
  )},
  { key: 'ChoPhepXemQuiz', label: 'Xem TN', width: '90px', render: (v) => (
    <span className={`badge ${v ? 'badge-success' : 'badge-danger'}`}>{v ? 'Có' : 'Không'}</span>
  )},
];

const csvColumns = ['TenLopMon', 'MaLop', 'MaMH', 'MaGV', 'MaHocKi'];

const initialFields: FieldConfig[] = [
  { key: 'MaLopMon', label: 'Mã lớp môn (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
  { key: 'TenLopMon', label: 'Tên lớp môn (tùy chọn)' },
  { key: 'MaLop', label: 'Mã lớp', type: 'datalist' },
  { key: 'MaMH', label: 'Mã môn học', type: 'datalist' },
  { key: 'MaGV', label: 'Mã giáo viên', type: 'datalist' },
  { key: 'MaHocKi', label: 'Mã học kì', type: 'datalist' },
  { key: 'ChoPhepXemDiem', label: 'Cho phép xem điểm', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'ChoPhepXemQuiz', label: 'Cho phép xem TN', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
];

export default function LopMonHocPage() {
  const [fields, setFields] = useState<FieldConfig[]>(initialFields);
  const [cols, setCols] = useState<TableColumn<LopMonHoc>[]>(initialColumns);

  useEffect(() => {
    Promise.all([
      lopApi.getAll(),
      monHocApi.getAll(),
      giaoVienApi.getAll(),
      hocKiApi.getAll(),
      namHocApi.getAll(),
    ]).then(([lops, monHocs, gvs, hks, namHocs]) => {
      const lopOpts = lops.map(l => ({ value: String(l.MaLop), label: `${l.MaLop} - ${l.TenLop}` }));
      const mhOpts = monHocs.map(m => ({ value: String(m.MaMH), label: `${m.MaMH} - ${m.TenMH}` }));
      const gvOpts = gvs.map(g => ({ value: String(g.MaGV), label: `${g.MaGV} - ${g.TenGV}` }));
      const hkOpts = hks.map(h => ({ value: String(h.MaHocKi), label: `${h.MaHocKi} - ${h.TenHocKi}` }));

      const mhMap = monHocs.reduce((acc, m) => { acc[m.MaMH] = m.TenMH; return acc; }, {} as Record<string, string>);
      const gvMap = gvs.reduce((acc, g) => { acc[g.MaGV] = g.TenGV; return acc; }, {} as Record<string, string>);
      const lopMap = lops.reduce((acc, l) => { acc[l.MaLop] = l.TenLop as string; return acc; }, {} as Record<string, string>);
      // build HK → TenHocKi + NamHoc label
      const namHocMap = namHocs.reduce((acc, n) => { acc[n.MaNamHoc] = n.NamHoc as string; return acc; }, {} as Record<string, string>);
      const hkMap = hks.reduce((acc, h) => {
        const nh = h.MaNamHoc ? namHocMap[h.MaNamHoc as string] : '';
        acc[h.MaHocKi] = `${h.TenHocKi}${nh ? ` (${nh})` : ''}`;
        return acc;
      }, {} as Record<string, string>);

      setCols([
        { key: 'MaLopMon', label: 'Mã LM', width: '110px' },
        { key: 'TenLopMon', label: 'Tên lớp môn', render: (v, row) => (v as string) || (row as LopMonHoc).TenMH || '—' },
        { key: 'MaMH', label: 'Môn học', width: '160px', render: (v) => { const n = mhMap[v as string]; return n ? n : (v as string) || '—'; } },
        { key: 'MaLop', label: 'Lớp', width: '120px', render: (v) => { const n = lopMap[v as string]; return n ? `${v} - ${n}` : (v as string) || '—'; } },
        { key: 'MaGV', label: 'Giáo viên', width: '120px', render: (v) => { const n = gvMap[v as string]; return n ? n : (v as string) || '—'; } },
        { key: 'MaHocKi', label: 'Học kỳ', width: '130px', render: (v) => hkMap[v as string] || (v as string) || '—' },
        { key: 'ChoPhepXemDiem', label: 'Xem điểm', width: '90px', render: (v) => (
          <span className={`badge ${v ? 'badge-success' : 'badge-danger'}`}>{v ? 'Có' : 'Không'}</span>
        )},
        { key: 'ChoPhepXemQuiz', label: 'Xem TN', width: '90px', render: (v) => (
          <span className={`badge ${v ? 'badge-success' : 'badge-danger'}`}>{v ? 'Có' : 'Không'}</span>
        )},
      ]);

      setFields([
        { key: 'MaLopMon', label: 'Mã lớp môn (tự sinh)', hiddenOnAdd: true, disabledOnEdit: true },
        { key: 'TenLopMon', label: 'Tên lớp môn (tùy chọn)' },
        { key: 'MaLop', label: 'Mã lớp', type: 'datalist', options: lopOpts },
        { key: 'MaMH', label: 'Mã môn học', type: 'datalist', options: mhOpts },
        { key: 'MaGV', label: 'Mã giáo viên', type: 'datalist', options: gvOpts },
        { key: 'MaHocKi', label: 'Mã học kì', type: 'datalist', options: hkOpts },
        { key: 'ChoPhepXemDiem', label: 'Cho phép xem điểm', type: 'select', options: [
          { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
        ]},
        { key: 'ChoPhepXemQuiz', label: 'Cho phép xem TN', type: 'select', options: [
          { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
        ]},
      ]);
    }).catch(() => {});
  }, []);

  const handleExportCsv = (data: LopMonHoc[]) => {
    const headers = ['Mã LM', 'Tên lớp môn', 'Mã lớp', 'Mã MH', 'Mã GV', 'Mã HK', 'Xem điểm', 'Xem TN'];
    const rows = data.map(lm => [
      lm.MaLopMon, lm.TenLopMon || '', lm.MaLop, lm.MaMH, lm.MaGV, lm.MaHocKi,
      lm.ChoPhepXemDiem ? 'Có' : 'Không', lm.ChoPhepXemQuiz ? 'Có' : 'Không'
    ]);
    exportToCsv('LopMonHoc.csv', headers, rows);
  };

  return (
    <GenericCrudPage<LopMonHoc>
      title="Quản lý Lớp môn học"
      columns={cols}
      fields={fields}
      rowKey="MaLopMon"
      api={lopMonHocApi}
      csvColumns={csvColumns}
      onExportCsv={handleExportCsv}
      transformBeforeSubmit={(data) => ({
        ...data,
        ChoPhepXemDiem: data.ChoPhepXemDiem === 'true' || data.ChoPhepXemDiem === true,
        ChoPhepXemQuiz: data.ChoPhepXemQuiz === 'true' || data.ChoPhepXemQuiz === true,
      })}
    />
  );
}
