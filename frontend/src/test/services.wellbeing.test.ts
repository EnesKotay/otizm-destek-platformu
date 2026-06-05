// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(vi.fn(() => ({})), { getState: vi.fn(() => ({ accessToken: null })) }),
}));

import api from '@/services/api';
import { wellbeingService } from '@/services/wellbeingService';

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

describe('wellbeingService', () => {
  it('getAll: /wellbeing endpoint\'ini çağırır ve listeyi döner', async () => {
    const entries = [
      { id: 'e1', date: '2026-06-01', answers: [7,6,5,8,7], score: 66, createdAt: '' },
    ];
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: entries } });

    const result = await wellbeingService.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(66);
    expect(mockApi.get).toHaveBeenCalledWith('/wellbeing');
  });

  it('upsert: doğru payload ile /wellbeing POST çağrısı yapar', async () => {
    const saved = { id: 'e2', date: '2026-06-03', answers: [8,7,8,9,8], score: 80, createdAt: '' };
    mockApi.post.mockResolvedValueOnce({ data: { success: true, data: { ...saved, entryDate: saved.date } } });

    const result = await wellbeingService.upsert({
      date: '2026-06-03',
      answers: [8,7,8,9,8],
      score: 80,
      notes: '',
    });

    expect(result.score).toBe(80);
    expect(mockApi.post).toHaveBeenCalledWith('/wellbeing', expect.objectContaining({
      entryDate: '2026-06-03',
      score: 80,
    }));
  });

  it('delete: /wellbeing/:id DELETE çağrısı yapar', async () => {
    mockApi.delete.mockResolvedValueOnce({});

    await wellbeingService.delete('e1');

    expect(mockApi.delete).toHaveBeenCalledWith('/wellbeing/e1');
  });
});
