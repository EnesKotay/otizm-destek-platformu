import api from './api';
import type { ConsultationCase, ConsultationReply } from '@/types';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const consultationService = {
  list: (status = 'all', q?: string, page = 0, size = 20) =>
    api.get<{ data: PaginatedResponse<ConsultationCase> }>('/consultations', {
      params: { status, q: q || undefined, page, size },
    }).then(r => r.data.data),

  getDetail: (id: string) =>
    api.get<{ data: ConsultationCase }>(`/consultations/${id}`).then(r => r.data.data),

  create: (payload: { title: string; description: string; tags: string[] }) =>
    api.post<{ data: ConsultationCase }>('/consultations', payload).then(r => r.data.data),

  addReply: (consultationId: string, content: string) =>
    api.post<{ data: ConsultationReply }>(`/consultations/${consultationId}/replies`, { content })
      .then(r => r.data.data),

  updateStatus: (consultationId: string, status: 'OPEN' | 'RESOLVED' | 'ARCHIVED') =>
    api.patch<{ data: ConsultationCase }>(`/consultations/${consultationId}/status`, { status })
      .then(r => r.data.data),
};
