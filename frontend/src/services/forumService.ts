import api from './api';
import type { ApiResponse, ForumPost, ForumComment, VoteRequest } from '@/types';

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

export const forumService = {
  getPosts: (params: { type?: string; tagIds?: string[]; q?: string; sort?: string; page?: number; size?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set('type', params.type);
    if (params.tagIds?.length) params.tagIds.forEach(id => searchParams.append('tagIds', id));
    if (params.q) searchParams.set('q', params.q);
    if (params.sort) searchParams.set('order', params.sort);
    searchParams.set('page', String(params.page || 0));
    searchParams.set('size', String(params.size || 20));
    return api.get<ApiResponse<PageResponse<ForumPost>>>(`/forum/posts?${searchParams}`)
      .then(r => r.data.data);
  },

  getPostsByCategory: (category: string, page = 0) =>
    api.get<ApiResponse<PageResponse<ForumPost>>>(`/forum/posts/category/${category}?page=${page}`)
      .then(r => r.data.data),

  getUnansweredQuestions: (page = 0) =>
    api.get<ApiResponse<PageResponse<ForumPost>>>(`/forum/posts/unanswered?page=${page}`)
      .then(r => r.data.data),

  getPost: (id: string) =>
    api.get<ApiResponse<ForumPost>>(`/forum/posts/${id}`).then(r => r.data.data),

  createPost: (data: Partial<ForumPost>) =>
    api.post<ApiResponse<ForumPost>>('/forum/posts', data).then(r => r.data.data),

  updatePost: (id: string, data: Partial<ForumPost>) =>
    api.put<ApiResponse<ForumPost>>(`/forum/posts/${id}`, data).then(r => r.data.data),

  deletePost: (id: string) =>
    api.delete(`/forum/posts/${id}`),

  acceptAnswer: (postId: string, commentId: string) =>
    api.post<ApiResponse<ForumPost>>(`/forum/posts/${postId}/accept/${commentId}`).then(r => r.data.data),

  getComments: (postId: string, page = 0) =>
    api.get<ApiResponse<PageResponse<ForumComment>>>(`/forum/posts/${postId}/comments?page=${page}`)
      .then(r => r.data.data),

  createComment: (postId: string, data: Partial<ForumComment>) =>
    api.post<ApiResponse<ForumComment>>(`/forum/posts/${postId}/comments`, data).then(r => r.data.data),

  updateComment: (postId: string, commentId: string, content: string) =>
    api.put<ApiResponse<ForumComment>>(`/forum/posts/${postId}/comments/${commentId}`, { content }).then(r => r.data.data),

  deleteComment: (postId: string, commentId: string) =>
    api.delete(`/forum/posts/${postId}/comments/${commentId}`),

  toggleVote: (data: VoteRequest) =>
    api.post<ApiResponse<VoteRequest>>('/votes', data).then(r => r.data.data),
};
