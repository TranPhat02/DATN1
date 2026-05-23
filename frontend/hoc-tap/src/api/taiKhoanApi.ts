import { createCrudApi } from './crudApi';
import type { TaiKhoan, TaiKhoanCreate, TaiKhoanUpdate } from '../shared/types';
import axiosClient from './axiosClient';

export const taiKhoanApi = {
  ...createCrudApi<TaiKhoan, TaiKhoanCreate, TaiKhoanUpdate>('/tai-khoan'),

  /** Create account and send email notification */
  createAndSendEmail: async (payload: TaiKhoanCreate & { Gmail?: string }): Promise<TaiKhoan> => {
    const { data } = await axiosClient.post<TaiKhoan>('/taikhoan/create-send-email', payload);
    return data;
  },
};
