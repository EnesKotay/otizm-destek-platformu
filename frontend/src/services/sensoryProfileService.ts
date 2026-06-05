import api from './api';
import type { ApiResponse } from '@/types';

export const sensoryProfileService = {
  get: (childId: string) =>
    api.get<ApiResponse<string>>(`/sensory-profile/${childId}`).then(r => {
      const raw = r.data.data;
      return raw ? JSON.parse(raw) : null;
    }),

  save: (childId: string, domains: Record<string, unknown>) =>
    api.put(`/sensory-profile/${childId}`, { domains }),
};
