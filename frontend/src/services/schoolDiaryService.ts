import api from './api';
import type { ApiResponse } from '@/types';

export interface DiaryReplyData { id: string; from: string; fromName: string; content: string; createdAt: string; }
export interface DiaryEntryData {
  id: string; childId: string; date: string; fromRole: string; fromName: string;
  category: string; content: string; replies: string; createdAt: string;
}

export const schoolDiaryService = {
  getAll: (childId: string) =>
    api.get<ApiResponse<DiaryEntryData[]>>(`/school-diary/child/${childId}`).then(r => r.data.data),

  create: (childId: string, data: { date: string; from: string; fromName: string; category: string; content: string }) =>
    api.post<ApiResponse<DiaryEntryData>>(`/school-diary/child/${childId}`, data).then(r => r.data.data),

  addReply: (entryId: string, data: { from: string; fromName: string; content: string }) =>
    api.post<ApiResponse<DiaryEntryData>>(`/school-diary/${entryId}/replies`, data).then(r => r.data.data),

  delete: (entryId: string) =>
    api.delete(`/school-diary/${entryId}`),
};
