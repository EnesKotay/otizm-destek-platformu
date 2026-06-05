import api from './api';
import type { ApiResponse } from '@/types';

export interface BuddyDto {
  relationshipId?: string;
  buddyId: string;
  fullName: string;
  city?: string;
  email?: string;
  profileImageUrl?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  isMentorRelation?: boolean;
  status: string; // PENDING, ACCEPTED, REJECTED, NONE
}

export const buddyService = {
  sendRequest: (receiverId: string, isMentorRequest: boolean) =>
    api.post<ApiResponse<unknown>>('/buddies/request', { receiverId, isMentorRequest }).then(r => r.data.data),

  acceptRequest: (relationshipId: string) =>
    api.post<ApiResponse<unknown>>(`/buddies/accept/${relationshipId}`).then(r => r.data.data),

  rejectRequest: (relationshipId: string) =>
    api.post<ApiResponse<void>>(`/buddies/reject/${relationshipId}`).then(r => r.data.data),

  removeBuddy: (relationshipId: string) =>
    api.delete<ApiResponse<void>>(`/buddies/remove/${relationshipId}`).then(r => r.data.data),

  getMyBuddies: () =>
    api.get<ApiResponse<BuddyDto[]>>('/buddies/my-list').then(r => r.data.data),

  getPendingRequests: () =>
    api.get<ApiResponse<BuddyDto[]>>('/buddies/pending').then(r => r.data.data),

  getNearbyBuddies: (maxDistanceKm = 15.0) =>
    api.get<ApiResponse<BuddyDto[]>>(`/buddies/nearby?maxDistanceKm=${maxDistanceKm}`).then(r => r.data.data),
};
