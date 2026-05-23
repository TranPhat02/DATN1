import { createCrudApi } from './crudApi';
import type { SinhVienLopMonHoc, SinhVienLopMonHocCreate, SinhVienLopMonHocUpdate } from '../shared/types';
import axiosClient from './axiosClient';

const base = createCrudApi<SinhVienLopMonHoc, SinhVienLopMonHocCreate, SinhVienLopMonHocUpdate>('/sv-lop-mon-hoc');

export const sinhVienLopMonHocApi = {
  ...base,
  /** Get all enrollments for a specific student (uses dedicated endpoint — faster & secure) */
  getBySv: async (maSV: string): Promise<SinhVienLopMonHoc[]> => {
    const { data } = await axiosClient.get<SinhVienLopMonHoc[]>(`/sv-lop-mon-hoc/by-sv/${maSV}`);
    return data;
  },
  /** Sync enrollment: auto-create missing SinhVienLopMonHoc + DiemMonHoc records for this student */
  syncEnrollment: async (maSV: string): Promise<{ synced: number; total: number; message: string }> => {
    const { data } = await axiosClient.post(`/sv-lop-mon-hoc/sync/${maSV}`);
    return data;
  },
  /** Get all students enrolled in a specific class-subject (with TenSV joined) */
  getByLopMon: async (maLopMon: string): Promise<SinhVienLopMonHoc[]> => {
    const { data } = await axiosClient.get<SinhVienLopMonHoc[]>(`/sv-lop-mon-hoc/by-lop-mon/${maLopMon}`);
    return data;
  },
  // Composite key update/delete
  update: async (maSV: string, maLopMon: string, payload: SinhVienLopMonHocUpdate): Promise<SinhVienLopMonHoc> => {
    const { data } = await axiosClient.put<SinhVienLopMonHoc>(`/sv-lop-mon-hoc/${maSV}/${maLopMon}`, payload);
    return data;
  },
  remove: async (maSV: string, maLopMon: string): Promise<void> => {
    await axiosClient.delete(`/sv-lop-mon-hoc/${maSV}/${maLopMon}`);
  },
};
