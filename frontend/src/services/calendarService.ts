import api from './api';
import type { ApiResponse, CalendarEvent } from '@/types';

export const calendarService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<CalendarEvent[]>>(`/calendar/child/${childId}`).then(r => r.data.data),

  getByRange: (childId: string, start: string, end: string) =>
    api.get<ApiResponse<CalendarEvent[]>>(`/calendar/child/${childId}/range?start=${start}&end=${end}`)
      .then(r => r.data.data),

  getUpcoming: () =>
    api.get<ApiResponse<CalendarEvent[]>>('/calendar/upcoming').then(r => r.data.data),

  create: (data: Partial<CalendarEvent>) =>
    api.post<ApiResponse<CalendarEvent>>('/calendar', data).then(r => r.data.data),

  update: (id: string, data: Partial<CalendarEvent>) =>
    api.put<ApiResponse<CalendarEvent>>(`/calendar/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/calendar/${id}`),
};
