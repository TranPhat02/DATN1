/**
 * Google Drive API service
 * Handles document listing, upload, delete, download, and assignment folders.
 */
import axiosClient from './axiosClient';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  parents?: string[];
  owners?: { displayName?: string; emailAddress?: string }[];
}

export interface DriveFolder {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  fileCount?: number;
}

export const driveApi = {
  /** List files in a folder (or root) */
  listFiles: async (folderId?: string): Promise<DriveFile[]> => {
    const params = folderId ? { folder_id: folderId } : {};
    const { data } = await axiosClient.get<DriveFile[]>('/drive/files', { params });
    return data;
  },

  /** List files for a specific lop-mon-hoc */
  listByLopMon: async (maLopMon: string): Promise<DriveFile[]> => {
    const { data } = await axiosClient.get<DriveFile[]>(`/drive/files/${maLopMon}`);
    return data;
  },

  /** Upload a file */
  upload: async (file: File, maLopMon: string, subfolder: string = 'tai_lieu'): Promise<DriveFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ma_lop_mon', maLopMon);
    formData.append('subfolder', subfolder);
    const { data } = await axiosClient.post<DriveFile>('/drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Delete a file */
  deleteFile: async (fileId: string): Promise<void> => {
    await axiosClient.delete(`/drive/files/${fileId}`);
  },

  /** Get download URL */
  getDownloadUrl: (fileId: string): string => {
    return `${axiosClient.defaults.baseURL}/drive/download/${fileId}`;
  },

  // ── Assignment Folder APIs ──

  /** List assignment subfolders for a class */
  listBaiTapFolders: async (maLopMon: string): Promise<DriveFolder[]> => {
    const { data } = await axiosClient.get<DriveFolder[]>(`/drive/folders/${maLopMon}/bai_tap`);
    return data;
  },

  /** Create an assignment subfolder */
  createBaiTapFolder: async (maLopMon: string, folderName: string): Promise<DriveFolder> => {
    const { data } = await axiosClient.post<DriveFolder>('/drive/folders', {
      ma_lop_mon: maLopMon,
      folder_name: folderName,
      subfolder: 'bai_tap',
    });
    return data;
  },

  /** Create a document subfolder */
  createDocumentFolder: async (maLopMon: string, folderName: string): Promise<DriveFolder> => {
    const { data } = await axiosClient.post<DriveFolder>('/drive/folders', {
      ma_lop_mon: maLopMon,
      folder_name: folderName,
      subfolder: 'tai_lieu',
    });
    return data;
  },

  /** List files inside a specific folder */
  listFolderFiles: async (folderId: string): Promise<DriveFile[]> => {
    const { data } = await axiosClient.get<DriveFile[]>(`/drive/folder-files/${folderId}`);
    return data;
  },

  /** Upload file to a specific folder */
  uploadToFolder: async (file: File, folderId: string): Promise<DriveFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', folderId);
    const { data } = await axiosClient.post<DriveFile>('/drive/upload-to-folder', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // ── Admin tree view ──

  /** Admin Explorer */
  adminExplorer: async (folderId: string): Promise<DriveFile[]> => {
    const { data } = await axiosClient.get<DriveFile[]>(`/drive/admin/explorer/${folderId}`);
    return data;
  },

  // ── Assignment folder lock APIs ──

  /** Update lock settings for a bai_tap folder */
  updateBaiTapLock: async (folderId: string, lockType: number, lockUntil: string = ''): Promise<{ message: string }> => {
    const { data } = await axiosClient.put(`/drive/baitap/${folderId}/lock`, { lockType, lockUntil });
    return data;
  },

  /** Get lock metadata for all bai_tap folders of a class */
  getBaiTapLocks: async (maLopMon: string): Promise<{ folderId: string; lockType: number; lockUntil: string }[]> => {
    const { data } = await axiosClient.get(`/drive/baitap/${maLopMon}/locks`);
    return data;
  },
};
