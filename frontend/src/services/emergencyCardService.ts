import api from './api';
import type { ApiResponse } from '@/types';

export interface EmergencyShareStatus {
  shareEnabled: boolean;
  shareToken: string | null;
  expiresAt: string | null;
  consentGranted: boolean;
}

export const emergencyCardService = {
  get: (childId: string) =>
    api.get<ApiResponse<string>>(`/emergency-card/${childId}`).then(r => {
      const raw = r.data.data;
      return raw ? JSON.parse(raw) : null;
    }),

  // Kart artık çocuk kimliğiyle değil, velinin ürettiği süreli paylaşım
  // jetonuyla okunur. Bkz. PublicEmergencyCardController.
  getPublicByToken: (shareToken: string) =>
    api.get<ApiResponse<string>>(`/public/emergency-card/${shareToken}`).then(r => {
      const raw = r.data.data;
      return raw ? JSON.parse(raw) : null;
    }),

  save: (childId: string, data: Record<string, unknown>) =>
    api.put(`/emergency-card/${childId}`, data),

  getShareStatus: (childId: string) =>
    api.get<ApiResponse<EmergencyShareStatus>>(`/emergency-card/${childId}/share`).then(r => r.data.data),

  enableShare: (childId: string, hours?: number) =>
    api
      .post<ApiResponse<{ shareToken: string; expiresAt: string }>>(
        `/emergency-card/${childId}/share`,
        null,
        { params: hours ? { hours } : undefined },
      )
      .then(r => r.data.data),

  disableShare: (childId: string) => api.delete(`/emergency-card/${childId}/share`),
};
