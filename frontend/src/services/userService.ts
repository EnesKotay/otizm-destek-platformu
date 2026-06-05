import api from './api';
import type { ApiResponse, User } from '@/types';

interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  city?: string;
  profileImageUrl?: string;
  bio?: string;
  institution?: string;
  licenseNumber?: string;
  expertTitle?: string;
  latitude?: string;
  longitude?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const userService = {
  getProfile: () =>
    api.get<ApiResponse<User>>('/users/me').then(r => r.data.data),

  updateProfile: (data: UpdateProfileData) =>
    api.put<ApiResponse<User>>('/users/me', data).then(r => r.data.data),

  changePassword: (data: ChangePasswordData) =>
    api.post<ApiResponse<void>>('/users/change-password', data),

  downloadData: () =>
    api.get('/users/data', { responseType: 'blob' }),

  deleteAccount: () =>
    api.delete('/users/me'),

  searchUsers: (q: string) =>
    api.get<ApiResponse<User[]>>(`/users/search?q=${encodeURIComponent(q)}`).then(r => r.data.data),

  getOnlineStatusBatch: (userIds: string[]) =>
    api.post<ApiResponse<Record<string, boolean>>>('/users/online-status/batch', userIds).then(r => r.data.data),
};
