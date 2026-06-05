import api from './api';
import type { ApiResponse, SimilarFamily } from '@/types';

interface MatchingFilters {
  minScore?: number;
  ageGroup?: string;
  sortBy?: string;
}

export const matchingService = {
  findSimilarFamilies: (childId: string, filters?: MatchingFilters) =>
    api.get<ApiResponse<SimilarFamily[]>>(`/matching/similar/${childId}`, { params: filters })
      .then(r => r.data.data),

  getMatchingStatus: () =>
    api.get<ApiResponse<boolean>>('/matching/status').then(r => r.data.data),

  toggleMatching: () =>
    api.put<ApiResponse<boolean>>('/matching/opt-out').then(r => r.data.data),
};
