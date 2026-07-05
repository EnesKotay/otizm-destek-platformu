import api from './api';
import type { SearchResult } from '@/types';

export interface SearchParams {
  q: string;
  type?: string;
  sort?: 'relevance' | 'newest' | 'oldest';
  dateFrom?: string;
  dateTo?: string;
  category?: string;
}

export const searchService = {
  search: (params: SearchParams) => {
    // Sadece tanımlı parametreleri gönder
    const queryParams: Record<string, string> = { q: params.q };
    if (params.type) queryParams.type = params.type;
    if (params.sort) queryParams.sort = params.sort;
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.category) queryParams.category = params.category;

    return api.get<{ data: SearchResult[] }>('/search', { params: queryParams }).then(r => r.data.data);
  }
};
