import api from './api';

export interface Institution {
  id: string;
  name: string;
  city: string;
  category: 'university-hospital' | 'private-hospital' | 'private-rehab' | 'state' | 'ngo';
  specialties: string[];
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  address?: string;
  sgkContract?: boolean;
  free?: boolean;
  ageRange?: string;
  services: string[];
  notes?: string;
}

export const institutionService = {
  getAll: () =>
    api.get<{ success: boolean; data: Institution[] }>('/institutions')
      .then(r => r.data.data),
};
