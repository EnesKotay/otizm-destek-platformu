import api from './api';
import type { ApiResponse, Notification } from '@/types';

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
}

export const notificationService = {
  getRecent: () =>
    api.get<ApiResponse<Notification[]>>('/notifications').then(r => r.data.data),

  getPaged: (page = 0, size = 20) =>
    api.get<ApiResponse<PageResponse<Notification>>>('/notifications/paged', { params: { page, size, sort: 'createdAt,desc' } }).then(r => r.data.data),

  getUnreadCount: () =>
    api.get<ApiResponse<number | { count?: number }>>('/notifications/unread-count').then(r => {
      const data = r.data.data;
      return typeof data === 'number' ? data : data?.count ?? 0;
    }),

  markRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put('/notifications/read-all'),

  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),

  deleteNotifications: (ids: string[]) =>
    api.delete('/notifications/bulk', { data: { ids } }),
};
