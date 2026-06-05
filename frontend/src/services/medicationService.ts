import api from './api';
import type { ApiResponse, Medication, MedicationLog } from '@/types';

export const medicationService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<Medication[]>>(`/medications/child/${childId}`).then(r => r.data.data),

  create: (data: Partial<Medication>) =>
    api.post<ApiResponse<Medication>>('/medications', data).then(r => r.data.data),

  update: (id: string, data: Partial<Medication>) =>
    api.put<ApiResponse<Medication>>(`/medications/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/medications/${id}`),

  toggle: (id: string, date: string, time = '') =>
    api.post<ApiResponse<MedicationLog>>(`/medications/${id}/toggle?date=${date}&time=${encodeURIComponent(time)}`).then(r => r.data.data),
};
