import api from './api';
import type { ApiResponse } from '@/types';

export interface ScreeningResultDto {
  id?: string;
  childId: string;
  childName?: string;
  testType: string;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  answers: Record<string, boolean>;
  createdAt?: string;
}

export const screeningService = {
  getAll: () =>
    api.get<ApiResponse<ScreeningResultDto[]>>('/screening').then(r => r.data.data),

  getByChild: (childId: string) =>
    api.get<ApiResponse<ScreeningResultDto[]>>(`/screening/child/${childId}`).then(r => r.data.data),

  save: (data: ScreeningResultDto) =>
    api.post<ApiResponse<ScreeningResultDto>>('/screening', data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/screening/${id}`),
};
