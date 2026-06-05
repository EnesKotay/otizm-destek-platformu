import api from './api';
import type { ApiResponse, DevelopmentNote } from '@/types';

export const noteService = {
  getByChild: (childId: string, page = 0, size = 20) =>
    api.get<ApiResponse<{ content: DevelopmentNote[]; totalPages: number }>>(`/notes/child/${childId}?page=${page}&size=${size}`)
      .then(r => r.data.data),

  getRecent: (childId: string) =>
    api.get<ApiResponse<DevelopmentNote[]>>(`/notes/child/${childId}/recent`).then(r => r.data.data),

  create: (data: Partial<DevelopmentNote>) =>
    api.post<ApiResponse<DevelopmentNote>>('/notes', data).then(r => r.data.data),

  update: (id: string, data: Partial<DevelopmentNote>) =>
    api.put<ApiResponse<DevelopmentNote>>(`/notes/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/notes/${id}`),

  getCount: () =>
    api.get<ApiResponse<number>>('/notes/count').then(r => r.data.data),
};
