import api from './api';
import type { ApiResponse, Group, GroupMeeting, User } from '@/types';

export const groupService = {
  getMyGroups: () =>
    api.get<ApiResponse<Group[]>>('/groups/my').then(r => r.data.data),

  search: (query: string) =>
    api.get<ApiResponse<Group[]>>(`/groups/search?query=${encodeURIComponent(query)}`).then(r => r.data.data),

  getByCategory: (category: string) =>
    api.get<ApiResponse<Group[]>>(`/groups/category/${category}`).then(r => r.data.data),

  create: (data: Partial<Group>) =>
    api.post<ApiResponse<Group>>('/groups', data).then(r => r.data.data),

  join: (id: string) =>
    api.post(`/groups/${id}/join`),

  leave: (id: string) =>
    api.post(`/groups/${id}/leave`),

  getMembers: (id: string) =>
    api.get<ApiResponse<User[]>>(`/groups/${id}/members`).then(r => r.data.data),

  getMeetings: (id: string) =>
    api.get<ApiResponse<GroupMeeting[]>>(`/groups/${id}/meetings`).then(r => r.data.data),

  createMeeting: (id: string, data: Partial<GroupMeeting>) =>
    api.post<ApiResponse<GroupMeeting>>(`/groups/${id}/meetings`, data).then(r => r.data.data),

  deleteMeeting: (id: string, meetingId: string) =>
    api.delete(`/groups/${id}/meetings/${meetingId}`).then(() => {}),

  deleteGroup: (id: string) =>
    api.delete(`/groups/${id}`).then(() => {}),

  updateGroup: (id: string, data: Partial<Group>) =>
    api.put<ApiResponse<Group>>(`/groups/${id}`, data).then(r => r.data.data),

  toggleVerify: (id: string) =>
    api.post<ApiResponse<Group>>(`/groups/${id}/verify`).then(r => r.data.data),
};
