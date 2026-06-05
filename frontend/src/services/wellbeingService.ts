import api from './api';
import type { ApiResponse, WellbeingEntry } from '@/types';

interface WellbeingEntryDto {
  id: string;
  entryDate: string;
  answers: number[];
  score: number;
  notes?: string;
  createdAt: string;
}

function fromDto(dto: WellbeingEntryDto): WellbeingEntry {
  return {
    id: dto.id,
    date: dto.entryDate,
    answers: dto.answers,
    score: dto.score,
    notes: dto.notes,
    createdAt: dto.createdAt,
  };
}

export const wellbeingService = {
  getAll: () =>
    api.get<ApiResponse<WellbeingEntryDto[]>>('/wellbeing').then(r => r.data.data.map(fromDto)),

  upsert: (data: Pick<WellbeingEntry, 'date' | 'answers' | 'score' | 'notes'>) =>
    api.post<ApiResponse<WellbeingEntryDto>>('/wellbeing', {
      entryDate: data.date,
      answers: data.answers,
      score: data.score,
      notes: data.notes,
    }).then(r => fromDto(r.data.data)),

  delete: (id: string) =>
    api.delete(`/wellbeing/${id}`),
};
