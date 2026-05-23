/**
 * Teacher DiemTracNghiemPage — Quiz score board grouped by quiz name.
 * Shows each quiz as an expandable section with a table of student scores.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { quizApi, type QuizSubmissionGroup, type QuizSubmissionRow } from '../../api/quizApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import { exportToCsv } from '../../shared/utils/helpers';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowDownTray,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import SubmissionDetailModal from '../../shared/components/SubmissionDetailModal';

interface Props {
  maLopMon: string;
}

export default function TeacherDiemTracNghiemPage({ maLopMon }: Props) {
  const [groups, setGroups] = useState<QuizSubmissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [choPhepXem, setChoPhepXem] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<{ quizId: string; maSV: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupedData, allLmh] = await Promise.all([
        quizApi.getGroupedSubmissions(maLopMon),
        lopMonHocApi.getAll(),
      ]);
      setGroups(groupedData);
      // Auto-expand first group
      if (groupedData.length > 0 && !expandedQuiz) {
        setExpandedQuiz(groupedData[0].quizId);
      }
      const lmh = allLmh.find((l) => l.MaLopMon === maLopMon);
      if (lmh) setChoPhepXem(lmh.ChoPhepXemQuiz);
    } catch {
      toast.error('Không thể tải điểm TN');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maLopMon]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePermission = async () => {
    try {
      await lopMonHocApi.update(maLopMon, { ChoPhepXemQuiz: !choPhepXem });
      setChoPhepXem(!choPhepXem);
      toast.success(choPhepXem ? 'Đã tắt xem điểm TN' : 'Đã mở xem điểm TN');
    } catch {
      toast.error('Cập nhật quyền thất bại');
    }
  };

  const filterRows = (rows: QuizSubmissionRow[]) =>
    search
      ? rows.filter(
          (r) =>
            r.maSV.toLowerCase().includes(search.toLowerCase()) ||
            r.tenSV.toLowerCase().includes(search.toLowerCase())
        )
      : rows;

  const exportGroupCsv = (group: QuizSubmissionGroup) => {
    exportToCsv(
      `diem_tn_${group.quizId}.csv`,
      ['Mã SV', 'Họ tên', 'Môn học', 'Số câu đúng', 'Tổng câu', 'Điểm (10)', 'Vi phạm', 'Thời gian làm', 'Thời gian nộp', 'Trạng thái'],
      group.submissions.map((r) => [
        r.maSV,
        r.tenSV,
        group.tenMH,
        r.soCauDung,
        r.tongSoCau,
        r.diem,
        r.soLanViPham,
        r.thoiGianLam ? `${Math.floor(r.thoiGianLam / 60)}p ${r.thoiGianLam % 60}s` : '',
        r.thoiGianNop ? new Date(r.thoiGianNop).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '',
        r.status === 'graded' ? 'Đã chấm' : 'Chờ chấm',
      ])
    );
  };

  const exportAllCsv = () => {
    const rows: any[] = [];
    for (const g of groups) {
      for (const r of g.submissions) {
        rows.push([
          g.quizTitle, r.maSV, r.tenSV, g.tenMH,
          r.soCauDung, r.tongSoCau, r.diem, r.soLanViPham,
          r.thoiGianLam ? `${Math.floor(r.thoiGianLam / 60)}p ${r.thoiGianLam % 60}s` : '',
          r.thoiGianNop ? new Date(r.thoiGianNop).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '',
          r.status === 'graded' ? 'Đã chấm' : 'Chờ chấm',
        ]);
      }
    }
    exportToCsv(
      `diem_trac_nghiem_${maLopMon}.csv`,
      ['Tên bài TN', 'Mã SV', 'Họ tên', 'Môn học', 'Số câu đúng', 'Tổng câu', 'Điểm (10)', 'Vi phạm', 'Thời gian làm', 'Thời gian nộp', 'Trạng thái'],
      rows
    );
  };

  const totalSubmissions = groups.reduce((s, g) => s + g.totalSubmissions, 0);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>;
  }

  return (
    <div className="animate-fade-in">
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="search-bar">
            <HiOutlineMagnifyingGlass className="search-icon" />
            <input
              className="input"
              placeholder="Tìm mã SV hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 'var(--space-10)', width: '220px' }}
            />
          </div>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
            {groups.length} bài TN · {totalSubmissions} lượt nộp
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={exportAllCsv}>
            <HiOutlineArrowDownTray /> Xuất tất cả CSV
          </button>
          <button className={`btn ${choPhepXem ? 'btn-success' : 'btn-danger'}`} onClick={togglePermission}>
            {choPhepXem ? <HiOutlineEye /> : <HiOutlineEyeSlash />}
            {choPhepXem ? 'Đang cho xem' : 'Đang ẩn'}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {groups.length === 0 && (
        <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-tertiary)' }}>
          <HiOutlineAcademicCap style={{ fontSize: '3rem', marginBottom: 'var(--space-4)', opacity: 0.4 }} />
          <p>Chưa có sinh viên nào nộp bài trắc nghiệm</p>
        </div>
      )}

      {/* ── Quiz groups ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {groups.map((group) => {
          const isExpanded = expandedQuiz === group.quizId;
          const filteredRows = filterRows(group.submissions);
          const avgDiem = group.submissions.length > 0
            ? (group.submissions.reduce((s, r) => s + r.diem, 0) / group.submissions.length).toFixed(1)
            : '—';

          return (
            <div
              key={group.quizId}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              {/* ── Quiz header row (clickable to expand) ── */}
              <button
                onClick={() => setExpandedQuiz(isExpanded ? null : group.quizId)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-4) var(--space-5)',
                  background: isExpanded ? 'var(--bg-active)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: isExpanded ? '1px solid var(--border-secondary)' : 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ color: 'var(--teams-accent)', fontSize: '1.1rem' }}>
                    {isExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
                      {group.quizTitle}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      Môn: <strong>{group.tenMH}</strong> · Mã lớp: {group.maLopMon}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {/* Stats chips */}
                  <span style={chipStyle('var(--teams-accent)', 'rgba(98, 100, 167, 0.15)')}>
                    <HiOutlineUserGroup style={{ verticalAlign: 'middle' }} /> {group.totalSubmissions} SV
                  </span>
                  <span style={chipStyle('var(--success-500)', 'rgba(16, 185, 129, 0.15)')}>
                    ĐTB: {avgDiem}
                  </span>
                  {/* Export button */}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); exportGroupCsv(group); }}
                    title="Xuất CSV bài này"
                  >
                    <HiOutlineArrowDownTray />
                  </button>
                </div>
              </button>

              {/* ── Expanded table ── */}
              {isExpanded && (
                <div>
                  {filteredRows.length === 0 ? (
                    <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      {search ? 'Không tìm thấy sinh viên phù hợp' : 'Chưa có sinh viên nào nộp bài này'}
                    </div>
                  ) : (
                    <div className="table-container" style={{ margin: 0, borderRadius: 0 }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Mã SV</th>
                            <th>Họ tên</th>
                            <th style={{ textAlign: 'center' }}>Số câu đúng</th>
                            <th style={{ textAlign: 'center' }}>Tổng câu</th>
                            <th style={{ textAlign: 'center' }}>Điểm (10)</th>
                            <th style={{ textAlign: 'center' }}>Vi phạm</th>
                            <th>Thời gian làm</th>
                            <th>Thời gian nộp</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((row, idx) => (
                            <tr key={`${group.quizId}-${row.maSV}`}>
                              <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>{idx + 1}</td>
                              <td><code style={{ fontSize: 'var(--font-size-sm)' }}>{row.maSV}</code></td>
                              <td style={{ fontWeight: 500 }}>{row.tenSV}</td>
                              <td style={{ textAlign: 'center' }}>{row.soCauDung}</td>
                              <td style={{ textAlign: 'center' }}>{row.tongSoCau}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  fontWeight: 700,
                                  color: row.diem >= 8 ? 'var(--success-600)' : row.diem >= 5 ? 'var(--warning-600)' : 'var(--danger-600)',
                                }}>
                                  {row.diem}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', color: row.soLanViPham > 0 ? 'var(--danger-600)' : 'inherit', fontWeight: row.soLanViPham > 0 ? 'bold' : 'normal' }}>
                                {row.soLanViPham}
                              </td>
                              <td>
                                {row.thoiGianLam
                                  ? `${Math.floor(row.thoiGianLam / 60)}p ${row.thoiGianLam % 60}s`
                                  : '—'}
                              </td>
                              <td style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                                {row.thoiGianNop
                                  ? new Date(row.thoiGianNop).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                                  : '—'}
                              </td>
                              <td>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '99px', fontSize: 'var(--font-size-xs)',
                                  background: row.status === 'graded' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                  color: row.status === 'graded' ? 'var(--success-400)' : 'var(--warning-400)',
                                  fontWeight: 600,
                                }}>
                                  {row.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setViewingSubmission({ quizId: group.quizId, maSV: row.maSV })}
                                  title="Xem chi tiết bài làm"
                                >
                                  <HiOutlineEye /> Xem
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewingSubmission && (
        <SubmissionDetailModal
          quizId={viewingSubmission.quizId}
          maSV={viewingSubmission.maSV}
          onClose={() => setViewingSubmission(null)}
        />
      )}
    </div>
  );
}

// ── Helpers ──
function chipStyle(color: string, bg: string): React.CSSProperties {
  return {
    background: bg,
    color,
    padding: '3px 10px',
    borderRadius: '99px', fontSize: 'var(--font-size-xs)',
    fontWeight: 600, whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  };
}
