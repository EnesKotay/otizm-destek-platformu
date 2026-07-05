import api from './api';
import type { ApiResponse } from '@/types';

export interface MeetupRequestDto {
  id: string;
  requesterId: string;
  requesterName: string;
  recipientId: string;
  recipientName: string;
  type: 'ONLINE' | 'YUZEYUZE';
  proposedDate: string;
  proposedTime: string;
  location?: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
}

export interface CreateMeetupRequestPayload {
  recipientId: string;
  type: 'ONLINE' | 'YUZEYUZE';
  proposedDate: string;
  proposedTime: string;
  location?: string;
  message?: string;
}

export const meetupRequestService = {
  getMyRequests: () =>
    api.get<ApiResponse<MeetupRequestDto[]>>('/meetup-requests').then(r => r.data.data),

  createRequest: (payload: CreateMeetupRequestPayload) =>
    api.post<ApiResponse<MeetupRequestDto>>('/meetup-requests', payload).then(r => r.data.data),

  updateStatus: (id: string, status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED') =>
    api.put<ApiResponse<MeetupRequestDto>>(`/meetup-requests/${id}/status`, { status }).then(r => r.data.data),
};
