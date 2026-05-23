import axiosClient from './axiosClient';

export interface ThongKeResponse {
  sinh_vien: number;
  giao_vien: number;
  mon_hoc: number;
  lop_hoc: number;
}

export const thongKeApi = {
  getThongKe: async (): Promise<ThongKeResponse> => {
    const { data } = await axiosClient.get<ThongKeResponse>('/thong-ke');
    return data;
  },
};
