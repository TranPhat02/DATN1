/**
 * BaiTapTab — Assignment submission via Google Drive folders
 * Teacher: create folders, view submissions, lock/unlock folders
 * Student: browse folders, upload files (blocked when locked)
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { driveApi, type DriveFile, type DriveFolder } from '../../api/driveApi';
import {
  HiOutlineFolderOpen,
  HiOutlineFolderPlus,
  HiOutlineArrowLeft,
  HiOutlineCloudArrowUp,
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineClipboardDocumentList,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
} from 'react-icons/hi2';
import './BaiTapTab.css';

interface BaiTapTabProps {
  maLopMon: string;
  isTeacher?: boolean;
}

interface FolderLock {
  folderId: string;
  lockType: number;
  lockUntil: string;
}

export default function BaiTapTab({ maLopMon, isTeacher }: BaiTapTabProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<DriveFolder | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Lock state
  const [locks, setLocks] = useState<FolderLock[]>([]);
  const [lockMenuId, setLockMenuId] = useState<string | null>(null);
  const [lockUntilInput, setLockUntilInput] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Refresh time for dynamic lock evaluation
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Load folders + locks
  useEffect(() => {
    loadFolders();
  }, [maLopMon]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const [data, lockData] = await Promise.all([
        driveApi.listBaiTapFolders(maLopMon),
        driveApi.getBaiTapLocks(maLopMon).catch(() => []),
      ]);
      setFolders(data);
      setLocks(lockData);
    } catch {
      toast.error('Không thể tải danh sách bài tập');
    } finally {
      setLoading(false);
    }
  };

  const getLock = (folderId: string): FolderLock | undefined =>
    locks.find((l) => l.folderId === folderId);

  const isFolderLocked = (folderId: string): boolean => {
    const lock = getLock(folderId);
    if (!lock) return false;
    if (lock.lockType === 1) return true;
    if (lock.lockType === 2 && lock.lockUntil) {
      return currentTime > new Date(lock.lockUntil).getTime();
    }
    return false;
  };

  const handleLockChange = async (folderId: string, lockType: number, lockUntil: string = '') => {
    try {
      await driveApi.updateBaiTapLock(folderId, lockType, lockUntil);
      toast.success(lockType === 0 ? 'Đã mở khoá' : 'Đã khoá bài tập');
      setLockMenuId(null);
      // Refresh locks
      const lockData = await driveApi.getBaiTapLocks(maLopMon).catch(() => []);
      setLocks(lockData);
    } catch {
      toast.error('Cập nhật khoá thất bại');
    }
  };

  const openFolder = async (folder: DriveFolder) => {
    setActiveFolder(folder);
    try {
      setLoadingFiles(true);
      const data = await driveApi.listFolderFiles(folder.id);
      setFiles(data);
    } catch {
      toast.error('Không thể tải file trong thư mục');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Vui lòng nhập tên thư mục');
      return;
    }
    try {
      await driveApi.createBaiTapFolder(maLopMon, newFolderName.trim());
      toast.success('Tạo thư mục thành công!');
      setNewFolderName('');
      setShowCreateFolder(false);
      loadFolders();
    } catch {
      toast.error('Tạo thư mục thất bại');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFolder) return;

    // Block upload if folder is locked (for students)
    if (!isTeacher && isFolderLocked(activeFolder.id)) {
      toast.error('Thư mục bài tập này đã bị khoá, không thể nộp bài.');
      return;
    }

    try {
      setUploading(true);
      await driveApi.uploadToFolder(file, activeFolder.id);
      toast.success('Nộp bài thành công!');
      const data = await driveApi.listFolderFiles(activeFolder.id);
      setFiles(data);
    } catch {
      toast.error('Nộp bài thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Xác nhận xoá file?')) return;
    try {
      await driveApi.deleteFile(fileId);
      toast.success('Đã xóa file');
      if (activeFolder) {
        const data = await driveApi.listFolderFiles(activeFolder.id);
        setFiles(data);
      }
    } catch {
      toast.error('Xóa file thất bại');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Xác nhận xoá thư mục này và toàn bộ file bên trong?')) return;
    try {
      await driveApi.deleteFile(folderId);
      toast.success('Đã xóa thư mục');
      loadFolders();
    } catch {
      toast.error('Xóa thư mục thất bại');
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>;
  }

  // Inside folder view
  if (activeFolder) {
    const folderLocked = isFolderLocked(activeFolder.id);
    return (
      <div className="baitap-tab animate-fade-in">
        <div className="baitap-header">
          <button className="btn btn-ghost" onClick={() => { setActiveFolder(null); setFiles([]); }}>
            <HiOutlineArrowLeft /> Quay lại
          </button>
          <h3 className="baitap-folder-title"><HiOutlineFolderOpen /> {activeFolder.name}</h3>
          {folderLocked && !isTeacher && (
            <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
              <HiOutlineLockClosed /> Đã khoá
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <label className={`btn btn-primary ${uploading || (folderLocked && !isTeacher) ? 'btn-disabled' : ''}`} style={{ cursor: uploading || (folderLocked && !isTeacher) ? 'not-allowed' : 'pointer' }}>
              <HiOutlineCloudArrowUp /> {uploading ? 'Đang tải...' : 'Nộp bài'}
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading || (folderLocked && !isTeacher)} />
            </label>
          </div>
        </div>

        {loadingFiles ? (
          <div className="loading-overlay"><div className="spinner" /><span>Đang tải file...</span></div>
        ) : files.length === 0 ? (
          <div className="baitap-empty">
            <HiOutlineDocumentText style={{ fontSize: '2rem', color: 'var(--text-tertiary)' }} />
            <p>Chưa có file nào trong thư mục này</p>
          </div>
        ) : (
          <div className="baitap-file-list">
            {files.map(file => (
              <div key={file.id} className="baitap-file-item">
                <div className="baitap-file-info">
                  <HiOutlineDocumentText className="baitap-file-icon" />
                  <div>
                    <div className="baitap-file-name">{file.name}</div>
                    <div className="baitap-file-meta">
                      {file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : ''} 
                      {file.createdTime ? ` • ${new Date(file.createdTime).toLocaleString('vi-VN')}` : ''}
                    </div>
                  </div>
                </div>
                <div className="baitap-file-actions">
                  {file.webViewLink && (
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                      <HiOutlineEye /> Xem
                    </a>
                  )}
                  {isTeacher && (
                    <button className="btn btn-ghost btn-sm action-delete" onClick={() => handleDeleteFile(file.id)}>
                      <HiOutlineTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Folder list view
  return (
    <div className="baitap-tab animate-fade-in">
      <div className="baitap-header">
        <h3 className="text-teams-panel-text-active font-semibold flex items-center gap-2 m-0">
          <HiOutlineClipboardDocumentList className="text-teams-accent text-xl" />
          Bài tập
        </h3>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateFolder(true)}>
            <HiOutlineFolderPlus /> Tạo thư mục
          </button>
        )}
      </div>

      {/* Create folder inline */}
      {showCreateFolder && (
        <div className="baitap-create-folder">
          <input className="input" placeholder="Tên thư mục mới..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
          <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>Tạo</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}>Hủy</button>
        </div>
      )}

      {folders.length === 0 ? (
        <div className="baitap-empty">
          <HiOutlineFolderOpen style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)' }} />
          <p>{isTeacher ? 'Chưa có thư mục bài tập. Hãy tạo thư mục mới để sinh viên nộp bài.' : 'Chưa có bài tập nào.'}</p>
        </div>
      ) : (
        <div className="baitap-folder-grid">
          {folders.map(folder => {
            const locked = isFolderLocked(folder.id);
            const lock = getLock(folder.id);
            return (
              <div
                key={folder.id}
                className="baitap-folder-card"
                onClick={() => { if (!locked || isTeacher) openFolder(folder); }}
                style={{ opacity: locked && !isTeacher ? 0.5 : 1, cursor: locked && !isTeacher ? 'not-allowed' : 'pointer', position: 'relative', zIndex: lockMenuId === folder.id ? 50 : 1 }}
              >
                <HiOutlineFolderOpen className="baitap-folder-icon" />
                <div className="baitap-folder-name">{folder.name}</div>
                <div className="baitap-folder-date">
                  {folder.createdTime ? new Date(folder.createdTime).toLocaleDateString('vi-VN') : ''}
                </div>

                {/* Lock status badges */}
                {locked && (
                  <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginTop: 'var(--space-1)' }}>
                    <HiOutlineLockClosed style={{ marginRight: '2px' }} />
                    {lock?.lockType === 1 ? 'Khoá cứng' : `Hết hạn lúc ${lock?.lockUntil ? new Date(lock.lockUntil).toLocaleString('vi-VN') : ''}`}
                  </span>
                )}
                {!locked && isTeacher && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', marginTop: 'var(--space-1)' }}>
                    <HiOutlineLockOpen style={{ marginRight: '2px' }} /> Mở
                  </span>
                )}

                {isTeacher && folder.fileCount !== undefined && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <span className="badge badge-primary">Đã nộp: {folder.fileCount}</span>
                  </div>
                )}

                {/* Teacher actions: lock + delete */}
                {isTeacher && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }} onClick={e => e.stopPropagation()}>
                    {/* Lock control */}
                    <div style={{ position: 'relative' }}>
                      <button
                        className={`btn btn-sm ${locked ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => setLockMenuId(lockMenuId === folder.id ? null : folder.id)}
                      >
                        {locked ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
                      </button>
                      {lockMenuId === folder.id && (
                        <div style={{ position: 'absolute', left: 0, top: '100%', zIndex: 100, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', minWidth: '240px', boxShadow: 'var(--shadow-lg)' }}>
                          <button className="btn btn-success btn-sm" style={{ width: '100%', marginBottom: 'var(--space-2)' }} onClick={() => handleLockChange(folder.id, 0)}>
                            <HiOutlineLockOpen /> Mở khoá
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ width: '100%', marginBottom: 'var(--space-2)' }} onClick={() => handleLockChange(folder.id, 1)}>
                            <HiOutlineLockClosed /> Khoá cứng
                          </button>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>Khoá theo thời hạn:</div>
                          <input type="datetime-local" className="input" value={lockUntilInput} onChange={e => setLockUntilInput(e.target.value)} style={{ width: '100%', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }} />
                          <button className="btn btn-warning btn-sm" style={{ width: '100%' }} disabled={!lockUntilInput} onClick={() => handleLockChange(folder.id, 2, new Date(lockUntilInput).toISOString())}>
                            ⏰ Khoá đến thời hạn
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm action-delete" onClick={() => handleDeleteFolder(folder.id)}>
                      <HiOutlineTrash />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
