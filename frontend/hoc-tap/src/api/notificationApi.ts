import axiosClient from './axiosClient';

export interface Notification {
  id: string;
  username: string;
  title: string;
  content: string;
  sourceName?: string;
  maLopMon?: string;
  announcementId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getUnread: async (): Promise<Notification[]> => {
    const { data } = await axiosClient.get<Notification[]>('/notifications');
    return data;
  },

  getCount: async (): Promise<{ count: number }> => {
    const { data } = await axiosClient.get<{ count: number }>('/notifications/count');
    return data;
  },

  markRead: async (id: string): Promise<void> => {
    await axiosClient.put(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await axiosClient.put('/notifications/read-all');
  },
};
