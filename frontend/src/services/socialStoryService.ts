import api from './api';
import type { ApiResponse, SocialStory } from '@/types';

export const socialStoryService = {
  getMine: () =>
    api.get<ApiResponse<SocialStory[]>>('/social-stories/mine').then(r => r.data.data),

  getPublic: (category?: string) =>
    api.get<ApiResponse<SocialStory[]>>(`/social-stories/public${category ? `?category=${category}` : ''}`).then(r => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<SocialStory>>(`/social-stories/${id}`).then(r => r.data.data),

  create: (data: Partial<SocialStory>) =>
    api.post<ApiResponse<SocialStory>>('/social-stories', data).then(r => r.data.data),

  update: (id: string, data: Partial<SocialStory>) =>
    api.put<ApiResponse<SocialStory>>(`/social-stories/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/social-stories/${id}`),

  getComments: (id: string) =>
    api.get<ApiResponse<import('@/types').SocialStoryComment[]>>(`/social-stories/${id}/comments`).then(r => r.data.data),

  addComment: (id: string, content: string) =>
    api.post<ApiResponse<import('@/types').SocialStoryComment>>(`/social-stories/${id}/comments`, { content }).then(r => r.data.data),

  deleteComment: (commentId: string) =>
    api.delete(`/social-stories/comments/${commentId}`),
};
