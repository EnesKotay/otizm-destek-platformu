// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/api', () => ({ default: apiMock }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(vi.fn(() => ({})), { getState: vi.fn(() => ({ accessToken: null })) }),
}));

async function loadChildService() {
  vi.resetModules();
  return (await import('@/services/childService')).childService;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('childService', () => {
  it('getAll: çocukları döner ve aynı istek için cache kullanır', async () => {
    const childService = await loadChildService();
    const children = [
      { id: 'c1', name: 'Ali', birthDate: '2020-01-01' },
      { id: 'c2', name: 'Ayşe', birthDate: '2019-05-10' },
    ];
    apiMock.get.mockResolvedValueOnce({ data: { success: true, data: children } });

    const first = await childService.getAll();
    const second = await childService.getAll();

    expect(first).toEqual(children);
    expect(second).toEqual(children);
    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith('/children');
  });

  it('getById: tek çocuk endpointini çağırır', async () => {
    const childService = await loadChildService();
    const child = { id: 'c1', name: 'Ali' };
    apiMock.get.mockResolvedValueOnce({ data: { success: true, data: child } });

    const result = await childService.getById('c1');

    expect(result).toEqual(child);
    expect(apiMock.get).toHaveBeenCalledWith('/children/c1');
  });

  it('create: doğru payload ile kayıt oluşturur ve liste cacheini temizler', async () => {
    const childService = await loadChildService();
    apiMock.get
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 'old', name: 'Eski' }] } })
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 'new', name: 'Yeni' }] } });
    apiMock.post.mockResolvedValueOnce({ data: { success: true, data: { id: 'new', name: 'Yeni' } } });

    await childService.getAll();
    const created = await childService.create({ name: 'Yeni' } as Parameters<typeof childService.create>[0]);
    const refreshed = await childService.getAll();

    expect(created).toEqual({ id: 'new', name: 'Yeni' });
    expect(refreshed).toEqual([{ id: 'new', name: 'Yeni' }]);
    expect(apiMock.post).toHaveBeenCalledWith('/children', { name: 'Yeni' });
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });

  it('update ve treatment-state endpointlerini doğru çağırır', async () => {
    const childService = await loadChildService();
    apiMock.put
      .mockResolvedValueOnce({ data: { success: true, data: { id: 'c1', name: 'Güncel' } } })
      .mockResolvedValueOnce({ data: { success: true, data: { id: 'c1', treatmentState: { aba: true } } } });

    const updated = await childService.update('c1', { name: 'Güncel' } as Parameters<typeof childService.update>[1]);
    const treatment = await childService.updateTreatmentState('c1', { aba: true });

    expect(updated.name).toBe('Güncel');
    expect(treatment.treatmentState).toEqual({ aba: true });
    expect(apiMock.put).toHaveBeenNthCalledWith(1, '/children/c1', { name: 'Güncel' });
    expect(apiMock.put).toHaveBeenNthCalledWith(2, '/children/c1/treatment-state', { aba: true });
  });

  it('delete: çocuk silme endpointini çağırır', async () => {
    const childService = await loadChildService();
    apiMock.delete.mockResolvedValueOnce({});

    await childService.delete('c1');

    expect(apiMock.delete).toHaveBeenCalledWith('/children/c1');
  });
});
