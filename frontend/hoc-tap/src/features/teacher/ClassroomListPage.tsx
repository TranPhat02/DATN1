/**
 * ClassroomListPage — Teacher's classroom list
 * Shows all classrooms the teacher is assigned to with schedule info.
 * Supports filtering by NamHoc and HocKi.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { lichHocApi } from '../../api/lichHocApi';
import { hocKiApi } from '../../api/hocKiApi';
import { namHocApi } from '../../api/namHocApi';
import { useAuth } from '../../shared/contexts/AuthContext';
import type { LopMonHoc, LichHoc, HocKi, NamHoc } from '../../shared/types';
import {
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineBookOpen,
  HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2';
import './ClassroomList.css';

export default function ClassroomListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<LopMonHoc[]>([]);
  const [schedules, setSchedules] = useState<LichHoc[]>([]);
  const [hocKis, setHocKis] = useState<HocKi[]>([]);
  const [namHocs, setNamHocs] = useState<NamHoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNamHoc, setFilterNamHoc] = useState('');
  const [filterHocKi, setFilterHocKi] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lmh, lh, hks, nhs] = await Promise.all([
          lopMonHocApi.getAll(),
          lichHocApi.getAll(),
          hocKiApi.getAll(),
          namHocApi.getAll(),
        ]);
        // Filter classrooms by teacher's username (which maps to MaGV)
        const myClassrooms = lmh.filter((c) => c.MaGV === user?.username);
        setClassrooms(myClassrooms);
        setSchedules(lh);
        setHocKis(hks);
        setNamHocs(nhs);
      } catch {
        toast.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // HocKis filtered by selected NamHoc
  const filteredHocKis = useMemo(() =>
    filterNamHoc ? hocKis.filter(hk => hk.MaNamHoc === filterNamHoc) : hocKis,
    [hocKis, filterNamHoc]
  );

  // Classrooms filtered by NamHoc + HocKi
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(cls => {
      if (filterHocKi && cls.MaHocKi !== filterHocKi) return false;
      if (filterNamHoc && !filterHocKi) {
        // Filter by NamHoc: match any HocKi in that NamHoc
        const hkIds = hocKis.filter(hk => hk.MaNamHoc === filterNamHoc).map(hk => hk.MaHocKi);
        if (!hkIds.includes(cls.MaHocKi as string)) return false;
      }
      return true;
    });
  }, [classrooms, filterNamHoc, filterHocKi, hocKis]);

  const getScheduleForClass = (maLopMon: string): LichHoc | undefined =>
    schedules.find((s) => s.MaLopMon === maLopMon);

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <span>Đang tải phòng dạy...</span>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Phòng dạy của tôi</h1>
        <span className="data-table-count">{filteredClassrooms.length} lớp</span>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineAdjustmentsHorizontal style={{ color: 'var(--text-tertiary)', fontSize: '1.1rem' }} />
        <select
          className="input"
          style={{ width: '180px' }}
          value={filterNamHoc}
          onChange={(e) => { setFilterNamHoc(e.target.value); setFilterHocKi(''); }}
        >
          <option value="">Tất cả năm học</option>
          {namHocs.map(nh => (
            <option key={nh.MaNamHoc} value={nh.MaNamHoc}>{nh.NamHoc as string}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: '200px' }}
          value={filterHocKi}
          onChange={(e) => setFilterHocKi(e.target.value)}
        >
          <option value="">Tất cả học kỳ</option>
          {filteredHocKis.map(hk => (
            <option key={hk.MaHocKi} value={hk.MaHocKi}>{hk.TenHocKi as string}</option>
          ))}
        </select>
        {(filterNamHoc || filterHocKi) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterNamHoc(''); setFilterHocKi(''); }}>
            Xoá bộ lọc
          </button>
        )}
      </div>

      {filteredClassrooms.length === 0 ? (
        <div className="empty-state">
          <HiOutlineBuildingOffice2 />
          <p>{classrooms.length === 0 ? 'Chưa có lớp môn học nào được phân công' : 'Không có lớp trong bộ lọc đã chọn'}</p>
        </div>
      ) : (
        <div className="classroom-grid">
          {filteredClassrooms.map((cls) => {
            const schedule = getScheduleForClass(cls.MaLopMon);
            const displayName = cls.TenLopMon || cls.TenMH || cls.MaMH || 'Môn học';
            return (
              <div
                key={cls.MaLopMon}
                className="classroom-card card"
                onClick={() => navigate(`/teacher/lop/${cls.MaLopMon}`)}
              >
                <div className="classroom-card-header">
                  <div className="classroom-card-icon">
                    <HiOutlineBookOpen />
                  </div>
                  <div>
                    <h3 className="classroom-card-title">{displayName}</h3>
                    <span className="classroom-card-code">{cls.MaLopMon}</span>
                  </div>
                </div>

                <div className="classroom-card-body">
                  <div className="classroom-info-row">
                    <HiOutlineBuildingOffice2 />
                    <span>Lớp: {cls.TenLop || cls.MaLop || '—'}</span>
                  </div>
                  {cls.TenHocKi && (
                    <div className="classroom-info-row">
                      <HiOutlineCalendarDays />
                      <span>{cls.TenHocKi}{cls.MaNamHoc ? ` · ${cls.MaNamHoc}` : ''}</span>
                    </div>
                  )}
                  {schedule && (
                    <>
                      <div className="classroom-info-row">
                        <HiOutlineCalendarDays />
                        <span>{schedule.Thu || '—'}</span>
                      </div>
                      <div className="classroom-info-row">
                        <HiOutlineClock />
                        <span>{schedule.Ca || '—'}</span>
                      </div>
                      <div className="classroom-info-row">
                        <HiOutlineMapPin />
                        <span>Phòng: {schedule.PhongHoc || '—'}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="classroom-card-footer">
                  <span className={`badge ${cls.ChoPhepXemDiem ? 'badge-success' : 'badge-danger'}`}>
                    Điểm: {cls.ChoPhepXemDiem ? 'Mở' : 'Đóng'}
                  </span>
                  <span className={`badge ${cls.ChoPhepXemQuiz ? 'badge-success' : 'badge-danger'}`}>
                    TN: {cls.ChoPhepXemQuiz ? 'Mở' : 'Đóng'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
