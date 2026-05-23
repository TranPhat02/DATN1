/**
 * KetQuaHocTapPage — Student GPA & grade summary grouped by semester
 * Shows grades grouped by HocKi with NamHoc headers.
 * Final summary: TC đã học, TC tích lũy, ĐTBHK, ĐTBTL (only passed courses counted).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { diemMonHocApi } from '../../api/diemMonHocApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { monHocApi } from '../../api/monHocApi';
import { hocKiApi } from '../../api/hocKiApi';
import { namHocApi } from '../../api/namHocApi';
import { useAuth } from '../../shared/contexts/AuthContext';
import type { DiemMonHoc, LopMonHoc, MonHoc, HocKi, NamHoc } from '../../shared/types';
import { formatScore } from '../../shared/utils/helpers';
import { HiOutlineChartBar } from 'react-icons/hi2';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import './KetQuaHocTap.css';

interface GradeEntry extends DiemMonHoc {
  TenMH?: string;
  SoTinChi?: number;
  MaHocKi?: string;
}

export default function KetQuaHocTapPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [hocKis, setHocKis] = useState<HocKi[]>([]);
  const [namHocs, setNamHocs] = useState<NamHoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allDiem, allLmh, allMh, allHk, allNh] = await Promise.all([
        diemMonHocApi.getAll(),
        lopMonHocApi.getAll(),
        monHocApi.getAll(),
        hocKiApi.getAll(),
        namHocApi.getAll(),
      ]);

      const myGrades: GradeEntry[] = allDiem
        .filter((d: DiemMonHoc) => {
          if (d.MaSV !== user?.username) return false;
          const lmh = allLmh.find((l: LopMonHoc) => l.MaLopMon === d.MaLopMon);
          // Only show score if the teacher allowed viewing grades (ChoPhepXemDiem is true)
          return lmh ? lmh.ChoPhepXemDiem === true : false;
        })
        .map((d: DiemMonHoc) => {
          const lmh = allLmh.find((l: LopMonHoc) => l.MaLopMon === d.MaLopMon);
          const mh = lmh ? allMh.find((m: MonHoc) => m.MaMH === lmh.MaMH) : undefined;
          return {
            ...d,
            TenMH: mh?.TenMH ?? (lmh?.TenMH as string) ?? d.MaLopMon ?? undefined,
            SoTinChi: mh?.SoTinChi || 0,
            MaHocKi: (lmh?.MaHocKi as string) || '',
          };
        });

      setGrades(myGrades);
      setHocKis(allHk);
      setNamHocs(allNh);
    } catch {
      toast.error('Không thể tải kết quả');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by HocKi
  const grouped = useMemo(() => {
    const map = new Map<string, GradeEntry[]>();
    grades.forEach((g) => {
      const key = g.MaHocKi || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });

    // Build entries with HocKi + NamHoc info
    const entries = Array.from(map.entries()).map(([maHocKi, items]) => {
      const hk = hocKis.find((h) => h.MaHocKi === maHocKi);
      const nh = hk?.MaNamHoc ? namHocs.find((n) => n.MaNamHoc === hk.MaNamHoc) : undefined;
      return {
        maHocKi,
        tenHocKi: hk?.TenHocKi || maHocKi,
        namHoc: nh?.NamHoc || '',
        items,
      };
    });

    // Sort by NamHoc ascending (oldest first), then TenHocKi ascending (HK1 before HK2)
    entries.sort((a, b) => {
      if (a.namHoc !== b.namHoc) return a.namHoc.localeCompare(b.namHoc);
      return a.tenHocKi.localeCompare(b.tenHocKi);
    });

    return entries;
  }, [grades, hocKis, namHocs]);

  // ── Chart data: GPA trend per semester ──
  const gpaChartData = useMemo(() => {
    return grouped.map((group) => {
      const withCredits = group.items.filter(g => g.SoTinChi && g.SoTinChi > 0 && g.DiemH4 !== null && g.DiemH4 !== undefined);
      const weighted = withCredits.reduce((s, g) => s + (g.DiemH4 || 0) * (g.SoTinChi || 0), 0);
      const totalTC = withCredits.reduce((s, g) => s + (g.SoTinChi || 0), 0);
      const gpa = totalTC > 0 ? weighted / totalTC : 0;
      const label = group.tenHocKi.replace('Học kì ', 'HK') + (group.namHoc ? ` (${group.namHoc})` : '');
      return { name: label, GPA: parseFloat(gpa.toFixed(2)) };
    });
  }, [grouped]);

  // ── Chart data: individual subject scores ──
  const subjectChartData = useMemo(() => {
    return grades
      .filter(g => g.DiemTK !== null && g.DiemTK !== undefined)
      .map(g => ({
        name: (g.TenMH || '').length > 15 ? (g.TenMH || '').slice(0, 14) + '…' : (g.TenMH || ''),
        DiemTK: g.DiemTK,
        DiemH4: g.DiemH4,
      }));
  }, [grades]);

  // Total stats
  const totalCredits = grades.reduce((sum, g) => sum + (g.SoTinChi || 0), 0);
  // Passed = DiemH4 >= 1.0 (not F)
  const passedGrades = grades.filter((g) => g.DiemH4 !== null && g.DiemH4 !== undefined && g.DiemH4 >= 1.0);
  const accumulatedCredits = passedGrades.reduce((sum, g) => sum + (g.SoTinChi || 0), 0);
  // ĐTBTL (accumulated GPA — only passed courses)
  const passedWithCredits = passedGrades.filter((g) => g.SoTinChi && g.SoTinChi > 0);
  const totalWeightedAccum = passedWithCredits.reduce((sum, g) => sum + (g.DiemH4 || 0) * (g.SoTinChi || 0), 0);
  const totalCreditsAccum = passedWithCredits.reduce((sum, g) => sum + (g.SoTinChi || 0), 0);
  const gpaAccum = totalCreditsAccum > 0 ? totalWeightedAccum / totalCreditsAccum : 0;

  // Overall GPA (all grades)
  const allWithCredits = grades.filter((g) => g.DiemH4 !== null && g.DiemH4 !== undefined && g.SoTinChi && g.SoTinChi > 0);
  const totalWeightedAll = allWithCredits.reduce((sum, g) => sum + (g.DiemH4 || 0) * (g.SoTinChi || 0), 0);
  const totalCreditsAll = allWithCredits.reduce((sum, g) => sum + (g.SoTinChi || 0), 0);
  const gpaAll = totalCreditsAll > 0 ? totalWeightedAll / totalCreditsAll : 0;

  const getGpaClass = (gpa: number) => {
    if (gpa >= 3.6) return 'Xuất sắc';
    if (gpa >= 3.2) return 'Giỏi';
    if (gpa >= 2.5) return 'Khá';
    if (gpa >= 2.0) return 'Trung bình';
    return 'Yếu';
  };

  if (loading) {
    return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /><span>Đang tải...</span></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Kết quả học tập</h1>
      </div>

      {/* Grades by semester */}
      {grouped.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu điểm</p>
        </div>
      ) : (
        grouped.map((group) => {
          const semCredits = group.items.filter(g => g.SoTinChi && g.SoTinChi > 0 && g.DiemH4 !== null && g.DiemH4 !== undefined);
          const semWeighted = semCredits.reduce((s, g) => s + (g.DiemH4 || 0) * (g.SoTinChi || 0), 0);
          const semTotalTC = semCredits.reduce((s, g) => s + (g.SoTinChi || 0), 0);
          const semGpa = semTotalTC > 0 ? semWeighted / semTotalTC : 0;

          return (
            <div key={group.maHocKi} style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ color: 'var(--primary-400)', marginBottom: 'var(--space-3)' }}>
                📚 {group.tenHocKi} {group.namHoc ? `(${group.namHoc})` : ''}
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-3)', fontWeight: 400 }}>
                  ĐTBHK: <strong style={{ color: semGpa >= 2.0 ? 'var(--success-400)' : 'var(--danger-400)' }}>{semGpa.toFixed(2)}</strong>
                </span>
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>#</th>
                      <th>Môn học</th>
                      <th style={{ width: '60px' }}>TC</th>
                      <th style={{ width: '70px' }}>GK</th>
                      <th style={{ width: '70px' }}>CK</th>
                      <th style={{ width: '70px' }}>TK</th>
                      <th style={{ width: '70px' }}>H4</th>
                      <th style={{ width: '60px' }}>Chữ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((g, i) => (
                      <tr key={g.MaDiem}>
                        <td className="row-num">{i + 1}</td>
                        <td>{g.TenMH}</td>
                        <td>{g.SoTinChi || '—'}</td>
                        <td>{formatScore(g.DiemGK as number)}</td>
                        <td>{formatScore(g.DiemCK as number)}</td>
                        <td>{formatScore(g.DiemTK as number)}</td>
                        <td style={{ fontWeight: 700, color: (g.DiemH4 || 0) >= 2 ? 'var(--success-400)' : 'var(--danger-400)' }}>
                          {formatScore(g.DiemH4 as number)}
                        </td>
                        <td>{g.DiemChu || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* ── Progress Charts ── */}
      {grades.length > 0 && gpaChartData.length > 1 && (
        <div className="kq-charts-section">
          <h3 style={{ color: 'var(--primary-400)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineChartBar style={{ fontSize: '1.25rem' }} />
            Biểu đồ tiến độ học tập
          </h3>
          <div className="kq-charts-grid">
            {/* GPA Trend Line Chart */}
            <div className="card kq-chart-card">
              <h4 className="kq-chart-title">Điểm TB học kì qua các kỳ</h4>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={gpaChartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-md)',
                      padding: '10px 14px',
                    }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                  />
                  <ReferenceLine y={2.0} stroke="var(--warning-400)" strokeDasharray="6 3" label={{ value: 'TB (2.0)', position: 'right', fill: 'var(--warning-400)', fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="GPA"
                    stroke="url(#gpaGradient)"
                    strokeWidth={3}
                    dot={{ r: 6, fill: 'var(--primary-400)', stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: 'var(--primary-300)' }}
                    name="ĐTBHK"
                  />
                  <defs>
                    <linearGradient id="gpaGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Subject Scores Bar Chart */}
            {subjectChartData.length > 0 && (
              <div className="card kq-chart-card">
                <h4 className="kq-chart-title">Điểm tổng kết từng môn</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        boxShadow: 'var(--shadow-md)',
                        padding: '10px 14px',
                      }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: '12px' }} />
                    <ReferenceLine y={5.0} stroke="var(--warning-400)" strokeDasharray="6 3" />
                    <Bar dataKey="DiemTK" name="Điểm TK" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overall Summary */}
      {grades.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <h3 className="text-teams-panel-text-active font-semibold mb-4 flex items-center gap-2">
            <HiOutlineChartBar className="text-teams-accent text-xl" />
            Tổng kết
          </h3>
          <div className="kq-summary">
            <div className="card kq-card">
              <h4>Số tín chỉ đã học</h4>
              <div className="kq-value">{totalCredits}</div>
              <span className="kq-label">tín chỉ</span>
            </div>
            <div className="card kq-card">
              <h4>Số tín chỉ tích lũy</h4>
              <div className="kq-value">{accumulatedCredits}</div>
              <span className="kq-label">tín chỉ đạt</span>
            </div>
            <div className="card kq-card">
              <h4>Điểm TB chung</h4>
              <div className="kq-value">{gpaAll.toFixed(2)}</div>
              <span className="kq-label">{getGpaClass(gpaAll)}</span>
            </div>
            <div className="card kq-card kq-card--gpa">
              <h4>Điểm TB chung tích lũy</h4>
              <div className="kq-value">{gpaAccum.toFixed(2)}</div>
              <span className="kq-label">{getGpaClass(gpaAccum)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
