/**
 * TaiLieuTab — Document management tab (Google Drive)
 * Used in both teacher and student classroom detail pages.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { driveApi, type DriveFile, type DriveFolder } from '../../api/driveApi';
import ConfirmModal from '../../shared/components/ConfirmModal';
import {
  HiOutlineArrowUpTray,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineArrowDownTray,
  HiOutlineEye,
  HiOutlineTableCells,
  HiOutlinePhoto,
  HiOutlineFilm,
  HiOutlineFolderPlus,
  HiOutlineArrowLeft,
  HiOutlineFolderOpen,
} from 'react-icons/hi2';
import './TaiLieuTab.css';

interface TaiLieuTabProps {
  maLopMon: string;
  canUpload?: boolean;
  canDelete?: boolean;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return <HiOutlineFolderOpen style={{ color: 'var(--teams-accent)' }} />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('csv')) return <HiOutlineTableCells />;
  if (mimeType?.includes('image')) return <HiOutlinePhoto />;
  if (mimeType?.includes('video')) return <HiOutlineFilm />;
  return <HiOutlineDocumentText />;
}

function formatFileSize(bytes?: string): string {
  if (!bytes) return '—';
  const size = parseInt(bytes, 10);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaiLieuTab({ maLopMon, canUpload = false, canDelete = false }: TaiLieuTabProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [activeFolder, setActiveFolder] = useState<DriveFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteFile, setDeleteFile] = useState<DriveFile | null>(null);
  
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      if (activeFolder) {
        const data = await driveApi.listFolderFiles(activeFolder.id);
        setFiles(data);
      } else {
        const data = await driveApi.listByLopMon(maLopMon);
        setFiles(data);
      }
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [maLopMon, activeFolder]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      if (activeFolder) {
        await driveApi.uploadToFolder(file, activeFolder.id);
      } else {
        await driveApi.upload(file, maLopMon, 'tai_lieu');
      }
      toast.success(`Tải lên "${file.name}" thành công!`);
      fetchFiles();
    } catch {
      toast.error('Tải lên thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Vui lòng nhập tên thư mục');
      return;
    }
    try {
      if (activeFolder) {
        toast.error("Chức năng tạo thư mục con chưa được hỗ trợ sâu. Chỉ hỗ trợ vòng ngoài.");
        return;
      }
      await driveApi.createDocumentFolder(maLopMon, newFolderName.trim());
      toast.success('Tạo thư mục thành công!');
      setNewFolderName('');
      setShowCreateFolder(false);
      fetchFiles();
    } catch {
      toast.error('Tạo thư mục thất bại');
    }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;
    try {
      await driveApi.deleteFile(deleteFile.id);
      toast.success('Đã xóa dữ liệu');
      setDeleteFile(null);
      fetchFiles();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Đang tải thông tin...</span></div>;
  }

  // Sort: folders first, then files
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const regularFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
  const sortedFiles = [...folders, ...regularFiles];

  return (
    <div className="tailieu-wrapper animate-fade-in">
      {/* Toolbar */}
      <div className="tailieu-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {activeFolder && (
            <button className="btn btn-ghost" onClick={() => setActiveFolder(null)}>
              <HiOutlineArrowLeft /> Quay lại
            </button>
          )}
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            {activeFolder ? `📂 ${activeFolder.name}` : `📁 Tài liệu chung`}
          </h3>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            ({files.length} mục)
          </span>
        </div>
        {canUpload && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
             {!activeFolder && (
              <button className="btn btn-secondary" onClick={() => setShowCreateFolder(true)}>
                <HiOutlineFolderPlus /> Tạo thư mục
              </button>
             )}
            <input ref={inputRef} type="file" onChange={handleUpload} style={{ display: 'none' }} />
            <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <HiOutlineArrowUpTray />
              {uploading ? 'Đang tải...' : 'Tải file'}
            </button>
          </div>
        )}
      </div>

      {showCreateFolder && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
          <input className="input" placeholder="Tên thư mục mới..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
          <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>Lưu</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}>Hủy</button>
        </div>
      )}

      {/* File List */}
      {files.length === 0 ? (
        <div className="tailieu-empty">
          <HiOutlineDocumentText />
          <p>Chưa có dữ liệu nào</p>
          <span>
            {canUpload 
              ? 'Nhấn "Tải file" hoặc "Tạo thư mục" để thêm' 
              : 'Giáo viên chưa chia sẻ tài liệu nào'}
          </span>
        </div>
      ) : (
        <div className="tailieu-grid">
          {sortedFiles.map((file) => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            return (
              <div key={file.id} className="tailieu-card card" onClick={() => { 
                if (isFolder) setActiveFolder(file); 
              }} style={{ cursor: isFolder ? 'pointer' : 'default' }}>
                <div className="tailieu-card-icon" style={{ fontSize: isFolder ? '1.8rem' : '1.5rem' }}>
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="tailieu-card-info">
                  <h4 className="tailieu-card-name" title={file.name}>{file.name}</h4>
                  <span className="tailieu-card-meta">
                    {isFolder ? 'Thư mục' : formatFileSize(file.size)}
                    {file.modifiedTime && ` • ${new Date(file.modifiedTime).toLocaleDateString('vi-VN')}`}
                  </span>
                </div>
                <div className="tailieu-card-actions" onClick={(e) => e.stopPropagation()}>
                  {!isFolder && file.webViewLink && (
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Xem">
                      <HiOutlineEye />
                    </a>
                  )}
                  {!isFolder && file.webContentLink && (
                    <a href={file.webContentLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Tải xuống">
                      <HiOutlineArrowDownTray />
                    </a>
                  )}
                  {canDelete && (
                    <button className="btn btn-ghost btn-icon btn-sm action-delete" onClick={() => setDeleteFile(file)} title="Xóa">
                      <HiOutlineTrash />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteFile}
        title="Xác nhận xóa"
        message={`Chắc chắn muốn xóa "${deleteFile?.name}" khỏi Google Drive? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteFile(null)}
      />
    </div>
  );
}
