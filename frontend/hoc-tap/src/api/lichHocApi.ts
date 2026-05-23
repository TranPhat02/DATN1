import { createCrudApi } from './crudApi';
import type { LichHoc, LichHocCreate, LichHocUpdate } from '../shared/types';
import axiosClient from './axiosClient';

const base = createCrudApi<LichHoc, LichHocCreate, LichHocUpdate>('/lich-hoc');

export const lichHocApi = {
  ...base,
  /** Auto-generate LichHoc for all LopMonHoc that don't have a schedule yet */
  autoGenerate: async (): Promise<{ created: number; message: string }> => {
    const { data } = await axiosClient.post('/lich-hoc/auto-generate');
    return data;
  },
  /** Import LichHoc from CSV file */
  importCsv: async (file: File): Promise<{ created: number; updated: number; skipped: number; message: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axiosClient.post('/lich-hoc/import-csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
