import api from './api';
import type { ApiResponse, Notification } from '@/types';

export const notificationService = {
  getRecent: () =>
    api.get<ApiResponse<Notification[]>>('/notifications').then(r => r.data.data),

  getUnreadCount: () =>
    api.get<ApiResponse<number | { count?: number }>>('/notifications/unread-count').then(r => {
      const data = r.data.data;
      return typeof data === 'number' ? data : data?.count ?? 0;
    }),

  markRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put('/notifications/read-all'),
};
