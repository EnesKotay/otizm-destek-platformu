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
    captchaToken?: string;
  }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data).then(r => r.data.data),

  checkEmail: (email: string) =>
    api.get<ApiResponse<{ available: boolean }>>(`/auth/check-email?email=${encodeURIComponent(email)}`).then(r => r.data.data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data).then(r => r.data.data),

  refresh: () =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh', {}).then(r => r.data.data),

  logout: () => api.post('/auth/logout', {}),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<string | null>>('/auth/forgot-password', { email }).then(r => r.data.data),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),

  getMe: () =>
    api.get<ApiResponse<AuthResponse['user']>>('/auth/me').then(r => r.data.data),
};
