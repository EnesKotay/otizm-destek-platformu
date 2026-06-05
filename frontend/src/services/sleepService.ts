import api from './api';
import type { ApiResponse, SleepEntry } from '@/types';

export const sleepService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<SleepEntry[]>>(`/sleep/child/${childId}`).then(r => r.data.data),

  getRange: (childId: string, from: string, to: string) =>
    api.get<ApiResponse<SleepEntry[]>>(`/sleep/child/${childId}/range?from=${from}&to=${to}`).then(r => r.data.data),

  upsert: (data: Partial<SleepEntry>) =>
    api.post<ApiResponse<SleepEntry>>('/sleep', data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/sleep/${id}`),
};
