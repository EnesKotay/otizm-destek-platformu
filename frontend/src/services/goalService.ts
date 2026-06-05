import api from './api';
import type { ApiResponse } from '@/types';

export interface GoalEntry { id: string; date: string; achieved: boolean; note?: string; }
export interface GoalData {
  id: string; childId: string; title: string; description: string; category: string;
  targetCount: number; tokenColor: string; tokenEmoji: string;
  rewardTitle: string; rewardDescription: string; active: boolean;
  entries: string; createdAt: string;
}

export const goalService = {
  getAll: (childId: string) =>
    api.get<ApiResponse<GoalData[]>>(`/goals/child/${childId}`).then(r => r.data.data),

  create: (childId: string, data: Partial<GoalData>) =>
    api.post<ApiResponse<GoalData>>(`/goals/child/${childId}`, data).then(r => r.data.data),

  update: (goalId: string, data: Partial<GoalData> & { entries?: string }) =>
    api.put<ApiResponse<GoalData>>(`/goals/${goalId}`, data).then(r => r.data.data),

  delete: (goalId: string) =>
    api.delete(`/goals/${goalId}`),
};
