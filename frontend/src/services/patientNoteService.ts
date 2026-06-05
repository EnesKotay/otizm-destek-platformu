import api from './api';
import type { ApiResponse } from '@/types';

export interface PatientNote {
  id: string;
  expertId: string;
  parentId: string;
  parentName: string;
  childId?: string;
  childName?: string;
  content: string;
  category: string;
  noteDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientNoteData {
  parentId: string;
  childId?: string;
  content: string;
  category?: string;
  noteDate: string;
}

export const patientNoteService = {
  getNotes: (parentId: string) =>
    api.get<ApiResponse<PatientNote[]>>('/patient-notes', { params: { parentId } }).then(r => r.data.data),

  createNote: (data: CreatePatientNoteData) =>
    api.post<ApiResponse<PatientNote>>('/patient-notes', data).then(r => r.data.data),

  deleteNote: (noteId: string) =>
    api.delete(`/patient-notes/${noteId}`).then(r => r.data),
};
