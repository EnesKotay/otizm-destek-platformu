import api from './api';
import type { AdminStats, ApiResponse, Report, User } from '@/types';
import type { WeeklyQuestion } from './communityService';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userFullName?: string;
  userEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  registrationsOpen: boolean;
  aiEnabled: boolean;
}

export interface ReportTargetPreview {
  targetType: string;
  targetId: string;
  available: boolean;
  title?: string;
  content?: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  createdAt?: string;
}

export interface BackupResult {
  filename: string;
  sizeBytes: number;
}

export interface UserActivitySummary {
  childrenCount: number | null;
  appointmentsCount: number | null;
  forumPostsCount: number;
  trackedActionsCount: number;
  recentActions: AuditLogEntry[];
}

export type GrowthPeriod = '7d' | '30d' | '90d' | '1y';

export const adminService = {
  getStats: () =>
    api.get<ApiResponse<AdminStats>>('/admin/stats').then(r => r.data.data),

  getGrowthAnalytics: (period: GrowthPeriod = '30d') =>
    api
      .get<ApiResponse<Array<{ name: string; users: number; sessions: number }>>>(
        '/admin/analytics/growth',
        { params: { period } }
      )
      .then(r => r.data.data),

  getPendingExperts: () =>
    api.get<ApiResponse<User[]>>('/admin/experts/pending').then(r => r.data.data),

  approveExpert: (expertId: string) =>
    api.post<ApiResponse<User>>(`/admin/experts/${expertId}/approve`).then(r => r.data.data),

  rejectExpert: (expertId: string) =>
    api.post<ApiResponse<User>>(`/admin/experts/${expertId}/reject`).then(r => r.data.data),

  // Reports — uses ReportController (already handles status filter + pagination)
  getReports: (status?: string) => {
    const params: Record<string, string | number> = { size: 100 };
    if (status && status !== 'all') params.status = status.toUpperCase();
    return api
      .get<ApiResponse<PageResponse<Report>>>('/reports', { params })
      .then(r => r.data.data.content);
  },

  resolveReport: (reportId: string, adminNote?: string) =>
    api
      .put<ApiResponse<Report>>(`/reports/${reportId}/status`, { status: 'RESOLVED', adminNote })
      .then(r => r.data.data),

  rejectReport: (reportId: string, adminNote?: string) =>
    api
      .put<ApiResponse<Report>>(`/reports/${reportId}/status`, { status: 'REJECTED', adminNote })
      .then(r => r.data.data),

  getReportTargetPreview: (reportId: string) =>
    api
      .get<ApiResponse<ReportTargetPreview>>(`/admin/reports/${reportId}/target-preview`)
      .then(r => r.data.data),

  warnReportTarget: (reportId: string) =>
    api
      .post<ApiResponse<Report>>(`/admin/reports/${reportId}/warn`)
      .then(r => r.data.data),

  removeReportTarget: (reportId: string) =>
    api
      .delete<ApiResponse<Report>>(`/admin/reports/${reportId}/target`)
      .then(r => r.data.data),

  getAuditLogs: (page = 0, size = 50, filters?: AuditLogFilters) => {
    const params: Record<string, string | number> = { page, size };
    if (filters?.userId) params.userId = filters.userId;
    if (filters?.action) params.action = filters.action;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    return api
      .get<ApiResponse<PageResponse<AuditLogEntry>>>('/admin/audit-logs', { params })
      .then(r => r.data.data);
  },

  getAllUsers: (page = 0, size = 50, query?: string, role?: string) => {
    const params: Record<string, string | number> = { page, size };
    if (query) params.query = query;
    if (role && role !== 'ALL') params.role = role;
    return api.get<ApiResponse<PageResponse<User>>>('/admin/users', { params }).then(r => r.data.data);
  },

  toggleUserStatus: (userId: string) =>
    api.post<ApiResponse<User>>(`/admin/users/${userId}/toggle-status`).then(r => r.data.data),

  changeUserRole: (userId: string, role: string) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}/role`, { role }).then(r => r.data.data),

  sendPasswordResetEmail: (userId: string) =>
    api.post<ApiResponse<void>>(`/admin/users/${userId}/send-password-reset`).then(r => r.data.data),

  getUserActivitySummary: (userId: string) =>
    api
      .get<ApiResponse<UserActivitySummary>>(`/admin/users/${userId}/activity-summary`)
      .then(r => r.data.data),

  bulkToggleUserStatus: (userIds: string[]) =>
    api
      .post<ApiResponse<{ updated: number }>>('/admin/users/bulk-toggle-status', { userIds })
      .then(r => r.data.data),

  exportUsers: (role?: string): Promise<void> => {
    const params: Record<string, string> = {};
    if (role && role !== 'ALL') params.role = role;
    return api
      .get('/admin/users/export', { params, responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kullaniciler.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  },

  getSettings: () =>
    api.get<ApiResponse<PlatformSettings>>('/admin/settings').then(r => r.data.data),

  updateSettings: (settings: Partial<PlatformSettings>) =>
    api.put<ApiResponse<PlatformSettings>>('/admin/settings', settings).then(r => r.data.data),

  triggerBackup: (): Promise<BackupResult> =>
    api.post('/admin/backup', null, { responseType: 'blob' }).then(r => {
      const disposition: string = r.headers['content-disposition'] || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `otizm-destek-yedek-${new Date().toISOString().slice(0, 10)}.sql`;
      const blob = new Blob([r.data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { filename, sizeBytes: blob.size };
    }),

  getTokenStats: () =>
    api.get<ApiResponse<{ used: number; budget: number; remaining: number; cost: number; estimated?: boolean; updatedAt: string }>>('/admin/token-stats').then(r => r.data.data),

  verifyExpertLicense: (expertId: string) =>
    api.post<ApiResponse<unknown>>(`/admin/experts/${expertId}/verify-license`).then(r => r.data.data),

  revokeExpertLicense: (expertId: string) =>
    api.delete<ApiResponse<unknown>>(`/admin/experts/${expertId}/verify-license`).then(r => r.data.data),

  getSystemMetrics: () =>
    api.get<ApiResponse<{
      cpuUsage: number;
      heapUsedMb: number;
      heapMaxMb: number;
      totalMemoryMb: number;
      usedMemoryMb: number;
      uptimeMs: number;
      availableProcessors: number;
    }>>('/admin/metrics').then(r => r.data.data),

  generateWeeklyQuestionWithAI: () =>
    api.post<ApiResponse<WeeklyQuestion>>('/admin/weekly-questions/generate-ai').then(r => r.data.data),
};
