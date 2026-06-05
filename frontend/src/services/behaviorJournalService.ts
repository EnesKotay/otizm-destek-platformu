import api from './api';
import type { ABCEntry, ApiResponse } from '@/types';

interface ABCEntryDto {
  id: string;
  childId: string;
  entryDate: string;
  entryTime?: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  category: string;
  location: string;
  notes?: string;
  createdAt: string;
}

type ABCEntryPayload = Omit<ABCEntry, 'id' | 'createdAt'>;

function fromDto(dto: ABCEntryDto): ABCEntry {
  return {
    id: dto.id,
    childId: dto.childId,
    date: dto.entryDate,
    time: (dto.entryTime || '').slice(0, 5),
    antecedent: dto.antecedent,
    behavior: dto.behavior,
    consequence: dto.consequence,
    intensity: dto.intensity,
    category: dto.category,
    location: dto.location,
    notes: dto.notes,
    createdAt: dto.createdAt,
  };
}

function toDto(data: ABCEntryPayload) {
  return {
    childId: data.childId,
    entryDate: data.date,
    entryTime: data.time,
    antecedent: data.antecedent,
    behavior: data.behavior,
    consequence: data.consequence,
    intensity: data.intensity,
    category: data.category,
    location: data.location,
    notes: data.notes,
  };
}

export const behaviorJournalService = {
  getByChild: (childId: string) =>
    api.get<ApiResponse<ABCEntryDto[]>>(`/abc-entries/child/${childId}`).then(r => r.data.data.map(fromDto)),

  create: (data: ABCEntryPayload) =>
    api.post<ApiResponse<ABCEntryDto>>('/abc-entries', toDto(data)).then(r => fromDto(r.data.data)),

  update: (id: string, data: ABCEntryPayload) =>
    api.put<ApiResponse<ABCEntryDto>>(`/abc-entries/${id}`, toDto(data)).then(r => fromDto(r.data.data)),

  delete: (id: string) =>
    api.delete(`/abc-entries/${id}`),
};
