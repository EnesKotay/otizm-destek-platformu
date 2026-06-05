import api from './api';
import type { ApiResponse } from '@/types';

export const emergencyCardService = {
  get: (childId: string) =>
    api.get<ApiResponse<string>>(`/emergency-card/${childId}`).then(r => {
      const raw = r.data.data;
      return raw ? JSON.parse(raw) : null;
    }),

  getPublic: (childId: string) =>
    api.get<ApiResponse<string>>(`/emergency-card/public/${childId}`).then(r => {
      const raw = r.data.data;
      return raw ? JSON.parse(raw) : null;
    }),

  save: (childId: string, data: Record<string, unknown>) =>
    api.put(`/emergency-card/${childId}`, data),
};
