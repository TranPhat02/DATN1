/**
 * LichDayPage — Teacher's teaching schedule (Gantt view)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { lichHocApi } from '../../api/lichHocApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { hocKiApi } from '../../api/hocKiApi';
import { namHocApi } from '../../api/namHocApi';
import { useAuth } from '../../shared/contexts/AuthContext';
import GanttSchedule from '../../shared/components/GanttSchedule';
import type { LichHoc, LopMonHoc, NamHoc, HocKi } from '../../shared/types';

export default function LichDayPage() {
  const { user } = useAuth();
  const [masterLichHoc, setMasterLichHoc] = useState<(LichHoc & { MaHocKi?: string; MaNamHoc?: string })[]>([]);
  const [namHocs, setNamHocs] = useState<NamHoc[]>([]);
  const [hocKis, setHocKis] = useState<HocKi[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedNamHoc, setSelectedNamHoc] = useState<string>('');
  const [selectedHocKi, setSelectedHocKi] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allLh, allLmh, allHk, allNh] = await Promise.all([
        lichHocApi.getAll(),
        lopMonHocApi.getAll(),
        hocKiApi.getAll(),
        namHocApi.getAll(),
      ]);

      setNamHocs(allNh);
      setHocKis(allHk);

      // Filter to only this teacher's classes
      const myClasses = allLmh.filter((lmh: LopMonHoc) => lmh.MaGV === user?.username);
      const myClassIds = myClasses.map((lmh: LopMonHoc) => lmh.MaLopMon);

      const lmMkMap = new Map<string, string>();
      allLmh.forEach((lm) => lmMkMap.set(lm.MaLopMon, lm.MaHocKi || ''));

      const hkNhMap = new Map<string, string>();
      allHk.forEach((hk) => hkNhMap.set(hk.MaHocKi, hk.MaNamHoc || ''));

      const enrichedLh = allLh
        .filter((lh: LichHoc) => myClassIds.includes(lh.MaLopMon || ''))
        .map((lh: LichHoc) => {
          const maHk = lmMkMap.get(lh.MaLopMon || '') || '';
          const maNh = hkNhMap.get(maHk) || '';
          return { ...lh, MaHocKi: maHk, MaNamHoc: maNh };
        });

      setMasterLichHoc(enrichedLh);
    } catch {
      toast.error('Không thể tải lịch dạy');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredHocKis = useMemo(() => {
    if (!selectedNamHoc) return hocKis;
    return hocKis.filter(hk => hk.MaNamHoc === selectedNamHoc);
  }, [hocKis, selectedNamHoc]);

  const filteredLichHoc = useMemo(() => {
    let result = masterLichHoc;
    if (selectedNamHoc) {
      result = result.filter(lh => lh.MaNamHoc === selectedNamHoc);
    }
    if (selectedHocKi) {
      result = result.filter(lh => lh.MaHocKi === selectedHocKi);
    }
    return result;
  }, [masterLichHoc, selectedNamHoc, selectedHocKi]);

  return (
    <div className="page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title">Lịch dạy của tôi</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            className="input" 
            value={selectedNamHoc} 
            onChange={(e) => { setSelectedNamHoc(e.target.value); setSelectedHocKi(''); }}
          >
            <option value="">-- Tất cả Năm học --</option>
            {namHocs.map(nh => <option key={nh.MaNamHoc} value={nh.MaNamHoc}>{nh.NamHoc}</option>)}
          </select>
          <select 
            className="input" 
            value={selectedHocKi} 
            onChange={(e) => setSelectedHocKi(e.target.value)}
          >
            <option value="">-- Tất cả Học kì --</option>
            {filteredHocKis.map(hk => <option key={hk.MaHocKi} value={hk.MaHocKi}>{hk.TenHocKi}</option>)}
          </select>
        </div>
      </div>
      <GanttSchedule data={filteredLichHoc} loading={loading} />
    </div>
  );
}
