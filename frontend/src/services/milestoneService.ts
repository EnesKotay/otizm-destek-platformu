import api from './api';
import type { ApiResponse, Milestone } from '@/types';

export const milestoneService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<Milestone[]>>(`/milestones/child/${childId}`).then(r => r.data.data),

  create: (data: Partial<Milestone>) =>
    api.post<ApiResponse<Milestone>>('/milestones', data).then(r => r.data.data),

  update: (id: string, data: Partial<Milestone>) =>
    api.put<ApiResponse<Milestone>>(`/milestones/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/milestones/${id}`),
};
