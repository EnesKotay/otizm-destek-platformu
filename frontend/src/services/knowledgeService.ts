import api from './api';
import type { KnowledgeArticle, ExpertAnalytics, ArticleComment } from '@/types';

interface PageResponse<T> { content: T[]; totalPages: number; totalElements: number; }

export const knowledgeService = {
  getAll: (page = 0, size = 12) =>
    api.get<{ data: PageResponse<KnowledgeArticle> }>('/knowledge', { params: { page, size } }).then(r => r.data.data),
  getByCategory: (category: string, page = 0) =>
    api.get<{ data: PageResponse<KnowledgeArticle> }>(`/knowledge/category/${category}`, { params: { page } }).then(r => r.data.data),
  search: (params: { q?: string; category?: string; format?: string; page?: number; size?: number }) =>
    api.get<{ data: PageResponse<KnowledgeArticle> }>('/knowledge/search', { params }).then(r => r.data.data),
  getOne: (id: string) =>
    api.get<{ data: KnowledgeArticle }>(`/knowledge/${id}`).then(r => r.data.data),
  getRelated: (id: string) =>
    api.get<{ data: KnowledgeArticle[] }>(`/knowledge/${id}/related`).then(r => r.data.data),
  getMy: (page = 0, size = 12) =>
    api.get<{ data: PageResponse<KnowledgeArticle> }>('/knowledge/my', { params: { page, size } }).then(r => r.data.data),
  getMyAnalytics: () =>
    api.get<{ data: ExpertAnalytics }>('/knowledge/my-analytics').then(r => r.data.data),
  create: (data: Partial<KnowledgeArticle>) =>
    api.post<{ data: KnowledgeArticle }>('/knowledge', data).then(r => r.data.data),
  update: (id: string, data: Partial<KnowledgeArticle>) =>
    api.put<{ data: KnowledgeArticle }>(`/knowledge/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/knowledge/${id}`),
  togglePublish: (id: string) =>
    api.post<{ data: KnowledgeArticle }>(`/knowledge/${id}/publish`).then(r => r.data.data),
  getComments: (articleId: string, page = 0, size = 20) =>
    api.get<{ data: PageResponse<ArticleComment> }>(`/knowledge/${articleId}/comments`, { params: { page, size } }).then(r => r.data.data),
  addComment: (articleId: string, content: string) =>
    api.post<{ data: ArticleComment }>(`/knowledge/${articleId}/comments`, { content }).then(r => r.data.data),
  generateAiDraft: (prompt: string) =>
    api.post<{ data: { title: string; category: string; content: string } }>('/knowledge/ai-draft', { prompt }).then(r => r.data.data),
};
