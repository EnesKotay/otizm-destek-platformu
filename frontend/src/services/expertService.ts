import api from './api';
import type { User } from '@/types';

export interface ExpertReview {
  id: string;
  expertId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerImageUrl?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ExpertReviewsResponse {
  reviews: ExpertReview[];
  averageRating: number;
  totalCount: number;
}

export const expertService = {
  getAll: (params?: { specialization?: string; city?: string }) =>
    api.get<{ data: User[] }>('/experts', { params }).then(r => r.data.data),
  getOne: (id: string) =>
    api.get<{ data: { expert: User; articleCount: number; reviewCount: number; avgRating: number } }>(`/experts/${id}`).then(r => r.data.data),
  getReviews: (expertId: string) =>
    api.get<{ data: ExpertReviewsResponse }>(`/experts/${expertId}/reviews`).then(r => r.data.data),
  submitReview: (expertId: string, payload: { rating: number; comment?: string }) =>
    api.post<{ data: ExpertReview }>(`/experts/${expertId}/reviews`, payload).then(r => r.data.data),
  deleteReview: (expertId: string, reviewId: string) =>
    api.delete(`/experts/${expertId}/reviews/${reviewId}`),
  updateProfile: (data: { bio?: string; expertTitle?: string; institution?: string; city?: string; specializations?: string[]; ageGroups?: string[]; supportTopics?: string[]; spokenLanguages?: string[]; sessionDurationMinutes?: number; cancellationPolicy?: string; reschedulePolicy?: string; acceptingPatients?: boolean; sessionFeeMin?: number; sessionFeeMax?: number; offersOnline?: boolean; offersFaceToFace?: boolean }) =>
    api.put<{ data: User }>('/experts/profile', data).then(r => r.data.data),
};
