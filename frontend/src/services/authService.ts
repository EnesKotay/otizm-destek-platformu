import api from './api';
import type { ApiResponse, AuthResponse } from '@/types';

export const authService = {
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    city?: string;
    kvkkConsent: boolean;
    role?: 'PARENT' | 'EXPERT';
    expertTitle?: string;
    institution?: string;
    licenseNumber?: string;
    bio?: string;
    specializations?: string[];
  }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data).then(r => r.data.data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data).then(r => r.data.data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }).then(r => r.data.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  getMe: () =>
    api.get<ApiResponse<AuthResponse['user']>>('/auth/me').then(r => r.data.data),
};
