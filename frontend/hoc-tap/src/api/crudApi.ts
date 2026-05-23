/**
 * Generic CRUD API factory
 * Creates standard CRUD functions for any entity endpoint.
 */
import axiosClient from './axiosClient';

export function createCrudApi<T, TCreate, TUpdate>(basePath: string) {
  return {
    getAll: async (): Promise<T[]> => {
      const { data } = await axiosClient.get<T[]>(basePath);
      return data;
    },

    getById: async (id: string): Promise<T> => {
      const { data } = await axiosClient.get<T>(`${basePath}/${id}`);
      return data;
    },

    create: async (payload: TCreate): Promise<T> => {
      const { data } = await axiosClient.post<T>(basePath, payload);
      return data;
    },

    update: async (id: string, payload: TUpdate): Promise<T> => {
      const { data } = await axiosClient.put<T>(`${basePath}/${id}`, payload);
      return data;
    },

    remove: async (id: string): Promise<void> => {
      await axiosClient.delete(`${basePath}/${id}`);
    },

    bulkCreate: async (items: TCreate[]): Promise<{ created: number }> => {
      const { data } = await axiosClient.post<{ created: number }>(`${basePath}/bulk`, items);
      return data;
    },
  };
}
