import api from './api';
import type { ApiResponse, Child } from '@/types';

function capitalizeName(name: string): string {
  return name.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

function cap(child: Child): Child {
  return child.name ? { ...child, name: capitalizeName(child.name) } : child;
}

// Oturum boyunca geçerli önbellek — aynı veriyi 18 kez çekmeyi önler
let _cache: Child[] | null = null;
let _pending: Promise<Child[]> | null = null;

const invalidate = () => { _cache = null; _pending = null; };

export const childService = {
  clearCache: invalidate,
  getAll: (): Promise<Child[]> => {
    if (_cache) return Promise.resolve(_cache);
    if (_pending) return _pending;
    _pending = api.get<ApiResponse<Child[]>>('/children')
      .then(r => {
        const raw = r.data?.data;
        _cache = Array.isArray(raw) ? raw.map(cap) : [];
        _pending = null;
        return _cache;
      })
      .catch(err => { _pending = null; throw err; });
    return _pending;
  },

  getById: (id: string) =>
    api.get<ApiResponse<Child>>(`/children/${id}`).then(r => cap(r.data.data)),

  create: async (data: Partial<Child>) => {
    const result = await api.post<ApiResponse<Child>>('/children', data).then(r => cap(r.data.data));
    invalidate();
    return result;
  },

  update: async (id: string, data: Partial<Child>) => {
    const result = await api.put<ApiResponse<Child>>(`/children/${id}`, data).then(r => cap(r.data.data));
    invalidate();
    return result;
  },

  updateTreatmentState: async (id: string, treatmentState: object) => {
    const result = await api.put<ApiResponse<Child>>(`/treatment-state/${id}`, treatmentState).then(r => r.data.data);
    invalidate();
    return result;
  },

  delete: async (id: string) => {
    await api.delete(`/children/${id}`);
    invalidate();
  },
};
