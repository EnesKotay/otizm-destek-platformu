import api from './api';
import type { ApiResponse, AppointmentRecord, ExpertAvailability } from '@/types';

export const appointmentService = {
  getAll: () =>
    api.get<ApiResponse<AppointmentRecord[]>>('/appointments').then(r => r.data.data),

  create: (data: Partial<AppointmentRecord> & { recurrenceWeeks?: number }) =>
    api.post<ApiResponse<AppointmentRecord>>('/appointments', data).then(r => r.data.data),

  cancelGroup: (groupId: string) =>
    api.delete<ApiResponse<void>>(`/appointments/group/${groupId}`).then(r => r.data),

  getGroup: (groupId: string) =>
    api.get<ApiResponse<AppointmentRecord[]>>(`/appointments/group/${groupId}`).then(r => r.data.data),

  cancel: (id: string, reason?: string) =>
    api.patch<ApiResponse<AppointmentRecord>>(`/appointments/${id}/cancel`, { reason }).then(r => r.data.data),

  confirm: (id: string) =>
    api.patch<ApiResponse<AppointmentRecord>>(`/appointments/${id}/confirm`).then(r => r.data.data),

  complete: (id: string) =>
    api.patch<ApiResponse<AppointmentRecord>>(`/appointments/${id}/complete`).then(r => r.data.data),

  reschedule: (id: string, data: { date: string; time: string; duration?: number }) =>
    api.patch<ApiResponse<AppointmentRecord>>(`/appointments/${id}/reschedule`, data).then(r => r.data.data),

  update: (id: string, data: { notes?: string; type?: string; meetingLink?: string }) =>
    api.patch<ApiResponse<AppointmentRecord>>(`/appointments/${id}/update`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/appointments/${id}`).then(r => r.data),

  updateSessionNotes: (id: string, sessionNotes: string) =>
    api.patch<ApiResponse<AppointmentRecord>>(`/appointments/${id}/session-notes`, { sessionNotes }).then(r => r.data.data),

  rate: (id: string, rating: number, comment?: string) =>
    api.patch<ApiResponse<AppointmentRecord>>(
      `/appointments/${id}/rate?rating=${rating}${comment ? `&comment=${encodeURIComponent(comment)}` : ''}`
    ).then(r => r.data.data),

  getPatients: () =>
    api.get<ApiResponse<Record<string, unknown>[]>>('/appointments/patients').then(r => r.data.data),

  getAvailability: () =>
    api.get<ApiResponse<ExpertAvailability[]>>('/appointments/availability').then(r => r.data.data),

  getExpertAvailability: (expertId: string) =>
    api.get<ApiResponse<ExpertAvailability[]>>(`/appointments/experts/${expertId}/availability`).then(r => r.data.data),

  getExpertBookedTimes: (expertId: string, date: string, duration?: number) =>
    api.get<ApiResponse<string[]>>(`/appointments/experts/${expertId}/booked-times?date=${encodeURIComponent(date)}${duration ? `&duration=${duration}` : ''}`).then(r => r.data.data),

  saveAvailability: async (items: ExpertAvailability[]): Promise<ExpertAvailability[]> => {
    const response = await api.put<ApiResponse<ExpertAvailability[]>>('/appointments/availability', items);
    return response.data.data;
  },

  blockSlot: async (date: string, time: string): Promise<void> => {
    await api.post('/appointments/block-slot', { date, time });
  },

  unblockSlot: async (date: string, time: string): Promise<void> => {
    await api.delete(`/appointments/unblock-slot?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
  },

  getHistory: (id: string) =>
    api.get<ApiResponse<AppointmentHistoryEntry[]>>(`/appointments/${id}/history`).then(r => r.data.data),
};

export interface AppointmentHistoryEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  changedById: string | null;
  changedByName: string;
  note: string | null;
  changedAt: string;
}
