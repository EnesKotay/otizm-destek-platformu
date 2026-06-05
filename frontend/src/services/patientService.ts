import api from './api';
import type { ApiResponse, ExpertStats, ExpertTask, PatientSummary, TaskSubmission } from '@/types';

export const patientService = {
  getPatients: () =>
    api.get<ApiResponse<PatientSummary[]>>('/patients').then(r => r.data.data),

  getMyTasks: () =>
    api.get<ApiResponse<ExpertTask[]>>('/patients/my-tasks').then(r => r.data.data),

  getTasks: (childId: string) =>
    api.get<ApiResponse<ExpertTask[]>>(`/patients/${childId}/tasks`).then(r => r.data.data),

  assignTask: (childId: string, data: Partial<ExpertTask>) =>
    api.post<ApiResponse<ExpertTask>>(`/patients/${childId}/tasks`, data).then(r => r.data.data),

  submitTask: (taskId: string, parentId: string, note?: string) =>
    api.post<ApiResponse<unknown>>('/task-submissions', { taskId, parentId, parentNote: note }).then(r => r.data.data),

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
    api.post<ApiResponse<PatientSummary>>('/patients/add', { parentEmail, childId }).then(r => r.data.data),
};
