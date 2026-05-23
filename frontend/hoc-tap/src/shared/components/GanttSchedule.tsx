/**
 * GanttSchedule — Gantt-style timetable (Thứ 2-7 × Ca 1-4)
 */
import type { LichHoc } from '../types';
import { CA_SCHEDULE, THU_SCHEDULE } from '../utils/constants';
import './GanttSchedule.css';

interface GanttScheduleProps {
  data: LichHoc[];
  loading?: boolean;
}

export default function GanttSchedule({ data, loading = false }: GanttScheduleProps) {
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Đang tải lịch...</span>
      </div>
    );
  }

  const getCell = (thu: string, ca: string): LichHoc[] => {
    return data.filter((item) => item.Thu === thu && item.Ca === ca);
  };

  return (
    <div className="gantt-container animate-fade-in">
      <div className="gantt-scroll">
        <table className="gantt-table">
          <thead>
            <tr>
              <th className="gantt-th-ca">Ca</th>
              {THU_SCHEDULE.map((thu) => (
                <th key={thu} className="gantt-th-thu">{thu}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CA_SCHEDULE.map((ca) => (
              <tr key={ca.key}>
                <td className="gantt-ca-cell">
                  <div className="gantt-ca-label">{ca.label}</div>
                  <div className="gantt-ca-time">{ca.time}</div>
                </td>
                {THU_SCHEDULE.map((thu) => {
                  const items = getCell(thu, ca.key);
                  return (
                    <td key={`${thu}-${ca.key}`} className="gantt-cell">
                      {items.length > 0 ? (
                        items.map((item) => (
                          <div key={item.MaLich} className="gantt-item">
                            <div className="gantt-item-subject">{item.TenMH || item.MaLopMon}</div>
                            <div className="gantt-item-detail">
                              {item.MaLop && <span>Lớp: {item.TenLop || item.MaLop}</span>}
                            </div>
                            <div className="gantt-item-detail">
                              {item.PhongHoc && <span>Phòng: {item.PhongHoc}</span>}
                            </div>
                            <div className="gantt-item-detail">
                              {item.TenGV && <span>GV: {item.TenGV}</span>}
                            </div>
                            <div className="gantt-item-date">
                              {item.NgayBatDau} → {item.NgayKetThuc}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="gantt-empty" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
