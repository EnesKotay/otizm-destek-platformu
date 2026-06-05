import api from './api';

export interface Venue {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  avgNoiseLevel: number;
  avgLightLevel: number;
  avgCrowdLevel: number;
}

export interface VenueReview {
  id?: string;
  venueId: string;
  userId?: string;
  noiseLevel: number;
  lightLevel: number;
  crowdLevel: number;
  comments: string;
  createdAt?: string;
}

export const venueService = {
  getAll: () => api.get<Venue[]>('/venues').then(r => r.data),
  create: (venue: Partial<Venue>) => api.post<Venue>('/venues', venue).then(r => r.data),
  getReviews: (id: string) => api.get<VenueReview[]>(`/venues/${id}/reviews`).then(r => r.data),
  addReview: (id: string, review: VenueReview) => api.post<VenueReview>(`/venues/${id}/reviews`, review).then(r => r.data),
};
