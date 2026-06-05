import api from './api';
import type { ApiResponse } from '@/types';

export interface ProgressNoteReply { id: string; fromRole: string; fromName: string; content: string; createdAt: string; }
export interface ProgressNoteData {
  id: string; childId: string; fromRole: string; fromName: string; type: string;
  title: string; content: string; status: string; dueDate?: string;
  completedAt?: string; expertId?: string; replies: string; createdAt: string;
}

export const sharedProgressService = {
  getNotes: (childId: string) =>
    api.get<ApiResponse<ProgressNoteData[]>>(`/shared-progress/child/${childId}`).then(r => r.data.data),

  createNote: (childId: string, data: Partial<ProgressNoteData>) =>
    api.post<ApiResponse<ProgressNoteData>>(`/shared-progress/child/${childId}`, data).then(r => r.data.data),

  updateStatus: (noteId: string, status: string) =>
    api.put<ApiResponse<ProgressNoteData>>(`/shared-progress/${noteId}/status`, { status }).then(r => r.data.data),

  addReply: (noteId: string, data: { fromRole: string; fromName: string; content: string }) =>
    api.post<ApiResponse<ProgressNoteData>>(`/shared-progress/${noteId}/replies`, data).then(r => r.data.data),

  updateNote: (noteId: string, data: Partial<ProgressNoteData>) =>
    api.put<ApiResponse<ProgressNoteData>>(`/shared-progress/${noteId}`, data).then(r => r.data.data),

  delete: (noteId: string) =>
    api.delete(`/shared-progress/${noteId}`),

  getTrend: (childId: string) =>
    api.get<ApiResponse<{
      weekly: { label: string; total: number; done: number }[];
      totalCount: number; doneCount: number; openCount: number;
      inProgressCount: number; completionRate: number;
      byType: Record<string, number>;
    }>>(`/shared-progress/child/${childId}/trend`).then(r => r.data.data),
};
