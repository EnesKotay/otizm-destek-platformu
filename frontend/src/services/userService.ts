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
  latitude?: number;
  longitude?: number;
  allowDirectMessages?: boolean;
  allowFamilyMessages?: boolean;
  hideOnlineStatus?: boolean;
  approximateLocationOnly?: boolean;
  communicationPreferences?: string[];
  supportIntents?: string[];
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

  deleteAccount: (currentPassword: string) =>
    api.delete('/users/me', { data: { currentPassword } }),

  searchUsers: (q: string) =>
    api.get<ApiResponse<User[]>>(`/users/search?q=${encodeURIComponent(q)}`).then(r => r.data.data),

  getOnlineStatusBatch: (userIds: string[]) =>
    api.post<ApiResponse<Record<string, boolean>>>('/users/online-status/batch', userIds).then(r => r.data.data),

  completeOnboarding: () =>
    api.post<ApiResponse<User>>('/users/me/onboarding-complete').then(r => r.data.data),

  updateAiConsent: (consent: boolean) =>
    api.post<ApiResponse<User>>(`/users/me/consent/ai?consent=${consent}`).then(r => r.data.data),

  updateEmergencyConsent: (consent: boolean) =>
    api.post<ApiResponse<User>>(`/users/me/consent/emergency?consent=${consent}`).then(r => r.data.data),
  blockUser: (userId: string) => api.post(`/users/${userId}/block`),
  unblockUser: (userId: string) => api.delete(`/users/${userId}/block`),
  getBlockedUsers: () => api.get<ApiResponse<User[]>>('/users/me/blocked').then(r => r.data.data),
};
