import api from './api';
import type { ApiResponse, MoodEntry } from '@/types';

export const moodService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<MoodEntry[]>>(`/mood/child/${childId}`).then(r => r.data.data),

  getRange: (childId: string, from: string, to: string) =>
    api.get<ApiResponse<MoodEntry[]>>(`/mood/child/${childId}/range?from=${from}&to=${to}`).then(r => r.data.data),

  upsert: (data: Partial<MoodEntry>) =>
    api.post<ApiResponse<MoodEntry>>('/mood', data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/mood/${id}`),
};
