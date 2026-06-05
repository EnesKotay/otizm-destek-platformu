import api from './api';
import type { ApiResponse } from '@/types';

export interface BepReportDto {
  id?: string;
  childId: string;
  studentName: string;
  diagnosis?: string;
  performance?: string;
  goals?: Record<string, unknown>[];
  schoolYear?: string;
  sharedAt?: string;
  createdById?: string;
}

export const bepReportService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<BepReportDto[]>>(`/bep-reports/child/${childId}`).then(r => r.data.data),

  create: (data: BepReportDto) =>
    api.post<ApiResponse<BepReportDto>>('/bep-reports', data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/bep-reports/${id}`),
};
