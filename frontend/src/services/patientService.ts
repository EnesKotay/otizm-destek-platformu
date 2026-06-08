import api from './api';
import type { ApiResponse, ExpertStats, ExpertTask, PatientSummary, TaskSubmission, ExpertConnectionRequest } from '@/types';

export const patientService = {
  getPatients: () =>
    api.get<ApiResponse<{ content: PatientSummary[]; totalElements: number; totalPages: number }>>('/patients')
      .then(r => r.data.data.content),

  getMyTasks: () =>
    api.get<ApiResponse<ExpertTask[]>>('/patients/my-tasks').then(r => r.data.data),

  getTasks: (childId: string) =>
    api.get<ApiResponse<ExpertTask[]>>(`/patients/${childId}/tasks`).then(r => r.data.data),

  assignTask: (childId: string, data: Partial<ExpertTask>) =>
    api.post<ApiResponse<ExpertTask>>(`/patients/${childId}/tasks`, data).then(r => r.data.data),

  submitTask: (taskId: string, parentId: string, note?: string, evidenceUrl?: string) =>
    api.post<ApiResponse<unknown>>('/task-submissions', { taskId, parentId, parentNote: note, evidenceUrl }).then(r => r.data.data),

  getTaskSubmissions: (taskId: string) =>
    api.get<ApiResponse<TaskSubmission[]>>(`/task-submissions/task/${taskId}`).then(r => r.data.data),

  reviewTaskSubmission: (submissionId: string, feedback: string) =>
    api.post<ApiResponse<TaskSubmission>>(`/task-submissions/${submissionId}/review`, { expertFeedback: feedback }).then(r => r.data.data),

  deleteTask: (taskId: string) =>
    api.delete(`/patients/tasks/${taskId}`).then(r => r.data),

  updateTask: (taskId: string, data: Partial<ExpertTask>) =>
    api.put<ApiResponse<ExpertTask>>(`/patients/tasks/${taskId}`, data).then(r => r.data.data),

  getExpertStats: () =>
    api.get<ApiResponse<ExpertStats>>('/experts/stats').then(r => r.data.data),

  searchParent: (email: string) =>
    api.get<ApiResponse<{ parentId: string; parentName: string; parentEmail: string; children: Array<{ id: string; name: string; diagnosis: string }> }>>('/patients/search-parent', { params: { email } }).then(r => r.data.data),

  addPatient: (parentEmail: string, childId: string) =>
    api.post<ApiResponse<void>>('/patients/add', { parentEmail, childId }).then(r => r.data),

  getConnectionRequests: () =>
    api.get<ApiResponse<ExpertConnectionRequest[]>>('/patients/connections/requests').then(r => r.data.data),

  getActiveConnections: () =>
    api.get<ApiResponse<ExpertConnectionRequest[]>>('/patients/connections/active').then(r => r.data.data),

  approveConnection: (id: string) =>
    api.post<ApiResponse<void>>(`/patients/connections/${id}/approve`).then(r => r.data),

  rejectConnection: (id: string) =>
    api.post<ApiResponse<void>>(`/patients/connections/${id}/reject`).then(r => r.data),

  revokeConnection: (id: string) =>
    api.post<ApiResponse<void>>(`/patients/connections/${id}/revoke`).then(r => r.data),

  getSentConnectionRequests: () =>
    api.get<ApiResponse<ExpertConnectionRequest[]>>('/patients/connections/sent-requests').then(r => r.data.data),

  cancelConnectionRequest: (id: string) =>
    api.post<ApiResponse<void>>(`/patients/connections/${id}/cancel`).then(r => r.data),
};
