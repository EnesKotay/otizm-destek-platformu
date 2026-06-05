import api from './api';
import type { ApiResponse } from '@/types';

export interface RoutineItemDto {
  id?: string;
  routineId?: string;
  title: string;
  description?: string;
  scheduledTime?: string;   // "HH:mm" formatında string
  iconName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineDto {
  id?: string;
  childId: string;
  name: string;
  description?: string;
  isActive?: boolean;
  items?: RoutineItemDto[];
  createdAt?: string;
  updatedAt?: string;
}

export const routineService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<RoutineDto[]>>(`/routines/child/${childId}`).then(r => r.data.data ?? []),

  create: (data: Pick<RoutineDto, 'childId' | 'name' | 'description'>) =>
    api.post<ApiResponse<RoutineDto>>('/routines', data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/routines/${id}`),

  addItem: (routineId: string, data: Omit<RoutineItemDto, 'id' | 'routineId' | 'createdAt' | 'updatedAt'>) =>
    api.post<ApiResponse<RoutineItemDto>>(`/routines/${routineId}/items`, data).then(r => r.data.data),

  deleteItem: (routineId: string, itemId: string) =>
    api.delete(`/routines/${routineId}/items/${itemId}`),
};
