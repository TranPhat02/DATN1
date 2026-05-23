/**
 * TaiLieuPage — Admin document management (Google Drive)
 * Full CRUD: view tree, create folders, upload, delete, with owner info
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { driveApi, type DriveFile } from '../../api/driveApi';
import {
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineArrowDownTray,
  HiOutlineTableCells,
  HiOutlineMagnifyingGlass,
  HiOutlineFolderOpen,
  HiOutlineCloudArrowUp,
} from 'react-icons/hi2';
import ConfirmModal from '../../shared/components/ConfirmModal';

export default function TaiLieuPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DriveFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stack contains folders we drilled into. Empty [] means we are at "root"
  const [folderStack, setFolderStack] = useState<DriveFile[]>([]);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : 'root';
      const data = await driveApi.adminExplorer(currentFolderId);
      setFiles(data);
    } catch { setFiles([]); }
    finally { setLoading(false); }
  }, [folderStack]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await driveApi.deleteFile(deleteTarget.id);
      toast.success('Đã xóa');
      setDeleteTarget(null);
      fetchFiles();
    } catch { toast.error('Xóa thất bại'); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const currentId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : 'root';
      if (currentId === 'root') {
        toast.error('Chỉ được upload tệp vào bên trong một thư mục cụ thể, không upload ở góc ngoài cùng.');
        return;
      }
      await driveApi.uploadToFolder(file, currentId);
      toast.success('Tải lên thành công!');
      fetchFiles();
    } catch {
      toast.error('Tải lên thất bại');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const isFolder = (f: DriveFile) => f.mimeType === 'application/vnd.google-apps.folder';

  const filtered = search
    ? files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : files;

  // Separate folders and files
  const folders = filtered.filter(isFolder);
  const docs = filtered.filter(f => !isFolder(f));

  const getIcon = (file: DriveFile) => {
    if (isFolder(file)) return <HiOutlineFolderOpen style={{ color: 'var(--teams-accent)', fontSize: '1.2rem' }} />;
    if (file.mimeType?.includes('spreadsheet')) return <HiOutlineTableCells style={{ color: 'var(--text-secondary)' }} />;
    return <HiOutlineDocumentText style={{ color: 'var(--text-secondary)' }} />;
  };

  const formatSize = (size?: string) => {
    if (!size) return '';
    const kb = parseInt(size) / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  const getOwner = (file: DriveFile) => {
    if (file.owners && file.owners.length > 0) {
      return file.owners[0].displayName || file.owners[0].emailAddress || '';
    }
    return '';
  };

  return (
    <div className="page animate-fade-in">
      <div className="data-table-toolbar">
        <div className="data-table-toolbar-left" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h2 className="data-table-title" style={{ cursor: 'pointer', margin: 0 }} onClick={() => setFolderStack([])}>
              📁 Gốc Drive
            </h2>
            {folderStack.map((f, i) => (
              <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                <span 
                  style={{ cursor: 'pointer', fontWeight: i === folderStack.length - 1 ? 600 : 400, color: i === folderStack.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  onClick={() => setFolderStack(folderStack.slice(0, i + 1))}
                >
                  {f.name}
                </span>
              </span>
            ))}
          </div>
          <span className="data-table-count">{folders.length} thư mục • {docs.length} tài liệu</span>
        </div>
        
        <div className="data-table-toolbar-right">
          <div className="search-bar">
            <HiOutlineMagnifyingGlass className="search-icon" />
            <input className="input" placeholder="Tìm tài liệu..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className={`btn btn-primary ${uploading || folderStack.length === 0 ? 'btn-disabled' : ''}`} style={{ cursor: uploading || folderStack.length === 0 ? 'not-allowed' : 'pointer' }}>
            <HiOutlineCloudArrowUp /> {uploading ? 'Đang tải...' : 'Tải lên'}
            {folderStack.length > 0 && <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />}
          </label>
        </div>
      </div>

      <div className="table-container" style={{ marginTop: 'var(--space-4)' }}>
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Tên</th>
                <th style={{ width: '120px' }}>Loại</th>
                <th style={{ width: '90px' }}>Kích thước</th>
                <th style={{ width: '140px' }}>Người tạo</th>
                <th style={{ width: '100px' }}>Ngày tạo</th>
                <th style={{ width: '120px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {[...folders, ...docs].length === 0 ? (
                <tr><td colSpan={7} className="empty-cell">Chưa có tài liệu</td></tr>
              ) : [...folders, ...docs].map((file, i) => (
                <tr key={file.id} onClick={() => isFolder(file) && setFolderStack([...folderStack, file])} style={{ cursor: isFolder(file) ? 'pointer' : 'default' }} className={isFolder(file) ? 'row-hoverable' : ''}>
                  <td className="row-num">{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {getIcon(file)}
                      <span style={{ fontWeight: isFolder(file) ? 600 : 400, color: isFolder(file) ? 'var(--teams-accent)' : 'var(--text-primary)' }}>{file.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                    {isFolder(file) ? 'Thư mục' : (file.mimeType?.split('.').pop() || file.mimeType || '—')}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>
                    {isFolder(file) ? '—' : formatSize(file.size)}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {getOwner(file) || '—'}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>
                    {file.createdTime ? new Date(file.createdTime).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-btns">
                      <a href={file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Xem">
                        <HiOutlineEye />
                      </a>
                      <a href={file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Tải">
                        <HiOutlineArrowDownTray />
                      </a>
                      <button className="btn btn-ghost btn-icon btn-sm action-delete" onClick={() => setDeleteTarget(file)} title="Xóa"><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Xóa dữ liệu"
        message={`Xóa "${deleteTarget?.name}"? ${deleteTarget?.mimeType === 'application/vnd.google-apps.folder' ? 'Tất cả file bên trong sẽ bị xóa.' : ''}`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
