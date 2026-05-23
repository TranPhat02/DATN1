/**
 * DataTable — Reusable data table with search, sort, pagination, add/edit/delete
 */
import { useState, useMemo, type ReactNode } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
} from 'react-icons/hi2';
import './DataTable.css';

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: string | ((row: T) => string);
  title: string;
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onImportCsv?: () => void;
  onExportCsv?: () => void;
  addLabel?: string;
  pageSize?: number;
  searchPlaceholder?: string;
  actions?: (row: T) => ReactNode;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  title,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onImportCsv,
  onExportCsv,
  addLabel = 'Thêm mới',
  pageSize = 10,
  searchPlaceholder = 'Tìm kiếm...',
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const safeData = Array.isArray(data) ? data : [];

  // ── Search filter ──
  const filtered = useMemo(() => {
    if (!search.trim()) return safeData;
    const q = search.toLowerCase();
    return safeData.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [safeData, search, columns]);

  // ── Sort ──
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'vi', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paged = sorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey]);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="data-table-wrapper animate-fade-in">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        <div className="data-table-toolbar-left">
          <h2 className="data-table-title">{title}</h2>
          <span className="data-table-count">{filtered.length} bản ghi</span>
        </div>
        <div className="data-table-toolbar-right">
          <div className="search-bar">
            <HiOutlineMagnifyingGlass className="search-icon" />
            <input
              type="text"
              className="input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              autoComplete="off"
            />
          </div>
          {onImportCsv && (
            <button className="btn btn-secondary" onClick={onImportCsv}>
              <HiOutlineArrowUpTray /> Import CSV
            </button>
          )}
          {onExportCsv && (
            <button className="btn btn-secondary" onClick={onExportCsv}>
              <HiOutlineArrowDownTray /> Xuất CSV
            </button>
          )}
          {onAdd && (
            <button className="btn btn-primary" onClick={onAdd}>
              <HiOutlinePlus /> {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width, cursor: col.sortable !== false ? 'pointer' : 'default' }}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <span className="th-content">
                      {col.label}
                      {sortKey === col.key && (
                        <span className="sort-icon">
                          {sortDir === 'asc' ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                {(onEdit || onDelete || actions) && <th style={{ width: '120px' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="empty-cell">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paged.map((row, idx) => (
                  <tr key={getRowKey(row)}>
                    <td className="row-num">{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : '—')}
                      </td>
                    ))}
                    {(onEdit || onDelete || actions) && (
                      <td>
                        <div className="action-btns">
                          {actions && actions(row)}
                          {onEdit && (
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(row)} title="Sửa">
                              <HiOutlinePencilSquare />
                            </button>
                          )}
                          {onDelete && (
                            <button className="btn btn-ghost btn-icon btn-sm action-delete" onClick={() => onDelete(row)} title="Xóa">
                              <HiOutlineTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination — always visible */}
      <div className="data-table-pagination">
        <span className="pagination-info">
          Dòng {sorted.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, sorted.length)} / {sorted.length}
        </span>
        {totalPages > 1 && (
          <div className="pagination-btns">
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage <= 1}
            >
              <HiOutlineChevronLeft />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (safeCurrentPage <= 3) {
                pageNum = i + 1;
              } else if (safeCurrentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = safeCurrentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`btn btn-sm ${pageNum === safeCurrentPage ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setPage(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              <HiOutlineChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
