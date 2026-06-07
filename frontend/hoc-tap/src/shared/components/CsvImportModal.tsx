/**
 * CsvImportModal — Upload CSV file, preview data, confirm import
 */
import { useState, useRef, type ChangeEvent } from 'react';
import { HiOutlineArrowUpTray, HiOutlineXMark, HiOutlineDocumentText } from 'react-icons/hi2';

interface CsvImportModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onImport?: (data: Record<string, string>[]) => void;
  onImportFile?: (file: File) => void;
  expectedColumns?: string[];
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

export default function CsvImportModal({
  open,
  title = 'Import CSV',
  onClose,
  onImport,
  onImportFile,
  expectedColumns,
}: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Vui lòng chọn file CSV');
      return;
    }
    setFile(f);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);

      if (expectedColumns) {
        const missing = expectedColumns.filter((c) => !parsed.headers.includes(c));
        if (missing.length > 0) {
          setError(`Thiếu cột: ${missing.join(', ')}`);
          setPreview(null);
          return;
        }
      }

      setPreview(parsed);
    };
    reader.readAsText(f, 'utf-8');
  };

  const handleImport = () => {
    if (file && onImportFile) {
      onImportFile(file);
      handleReset();
    } else if (preview && preview.rows.length > 0 && onImport) {
      onImport(preview.rows);
      handleReset();
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <HiOutlineDocumentText style={{ marginRight: 8 }} />
            {title}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <HiOutlineXMark />
          </button>
        </div>

        <div className="modal-body">
          {/* Upload area */}
          <div
            style={{
              border: '2px dashed var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-8)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color var(--transition-fast)',
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) {
                const dt = new DataTransfer();
                dt.items.add(f);
                if (inputRef.current) {
                  inputRef.current.files = dt.files;
                  inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }}
          >
            <HiOutlineArrowUpTray style={{ fontSize: '2rem', color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {file ? file.name : 'Kéo thả file CSV hoặc nhấn để chọn'}
            </p>
            <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          {error && (
            <div style={{ color: 'var(--danger-400)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
              ⚠️ {error}
            </div>
          )}

          {expectedColumns && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Cột yêu cầu: {expectedColumns.join(', ')}
            </div>
          )}

          {/* Preview */}
          {preview && preview.rows.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                Xem trước: {preview.rows.length} dòng
              </div>
              <div className="table-container" style={{ maxHeight: '250px', overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {preview.headers.map((h) => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {preview.headers.map((h) => <td key={h}>{row[h]}</td>)}
                      </tr>
                    ))}
                    {preview.rows.length > 10 && (
                      <tr>
                        <td colSpan={preview.headers.length} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          ... và {preview.rows.length - 10} dòng khác
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button
            className="btn btn-primary"
            disabled={!preview || preview.rows.length === 0}
            onClick={handleImport}
          >
            Import {preview ? `(${preview.rows.length} dòng)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
