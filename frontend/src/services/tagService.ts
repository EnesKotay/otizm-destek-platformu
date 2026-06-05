import api from './api';
import type { Tag, ApiResponse } from '@/types';

export const tagService = {
  getAllTags: async (): Promise<Tag[]> => {
    const { data } = await api.get<ApiResponse<Tag[]>>('/tags');
    return data.data;
  },

  getTagsByCategory: async (): Promise<Record<string, Tag[]>> => {
    const { data } = await api.get<ApiResponse<Record<string, Tag[]>>>('/tags/grouped');
    return data.data;
  },

  getTagsByCategoryName: async (category: string): Promise<Tag[]> => {
    const { data } = await api.get<ApiResponse<Tag[]>>(`/tags/category/${category}`);
    return data.data;
  },
};
