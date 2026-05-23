import axiosClient from './axiosClient';

export interface Announcement {
  id: string;
  maLopMon: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
  maKhoa?: string;
}

export const announcementApi = {
  get: async (maLopMon: string): Promise<Announcement[]> => {
    const { data } = await axiosClient.get<Announcement[]>(`/announcements/${maLopMon}`);
    return data;
  },

  getCount: async (maLopMon: string): Promise<{count: number}> => {
    const { data } = await axiosClient.get<{count: number}>(`/announcements/${maLopMon}/count`);
    return data;
  },

  create: async (
    maLopMon: string,
    title: string,
    content: string,
    fileId?: string,
    fileName?: string,
    fileUrl?: string,
    maKhoa?: string[],
    targetStudents?: string[],
    targetTeachers?: string[],
    recipientType?: string,
  ): Promise<Announcement> => {
    const { data } = await axiosClient.post<Announcement>(`/announcements/${maLopMon}`, {
      title,
      content,
      fileId,
      fileName,
      fileUrl,
      maKhoa: maKhoa?.length ? maKhoa : undefined,
      targetStudents: targetStudents?.length ? targetStudents : undefined,
      targetTeachers: targetTeachers?.length ? targetTeachers : undefined,
      recipientType: recipientType || 'all',
    });
    return data;
  },

  update: async (maLopMon: string, id: string, title: string, content: string): Promise<Announcement> => {
    const { data } = await axiosClient.put<Announcement>(`/announcements/${maLopMon}/${id}`, {
      title,
      content,
    });
    return data;
  },

  remove: async (maLopMon: string, id: string): Promise<void> => {
    await axiosClient.delete(`/announcements/${maLopMon}/${id}`);
  },
};
