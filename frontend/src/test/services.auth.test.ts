// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(vi.fn(() => ({})), { getState: vi.fn(() => ({ accessToken: null })) }),
}));

import api from '@/services/api';
import { authService } from '@/services/authService';

const mockApi = api as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  it('login: başarılı yanıtta token ve user döner', async () => {
    const fakeResponse = {
      data: {
        success: true,
        data: {
          accessToken: 'access_123',
          user: { id: 'u1', email: 'test@example.com', role: 'PARENT' },
        },
      },
    };
    mockApi.post.mockResolvedValueOnce(fakeResponse);

    const result = await authService.login({ email: 'test@example.com', password: 'pass' });

    expect(result.accessToken).toBe('access_123');
    expect(result.user.email).toBe('test@example.com');
    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'pass',
    });
  });

  it('register: doğru endpoint ve payload ile çağrılır', async () => {
    const fakeResponse = {
      data: {
        success: true,
        data: {
          accessToken: 'at',
          user: { id: 'u2', email: 'new@example.com', role: 'PARENT' },
        },
      },
    };
    mockApi.post.mockResolvedValueOnce(fakeResponse);

    const payload = {
      email: 'new@example.com',
      password: 'securepass',
      fullName: 'Test User',
      kvkkConsent: true,
      role: 'PARENT',
    };
    await authService.register(payload as Parameters<typeof authService.register>[0]);

    expect(mockApi.post).toHaveBeenCalledWith('/auth/register', payload);
  });

  it('refresh: token gövdesi göndermeden HttpOnly cookie akışını kullanır', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'renewed-access',
          user: { id: 'u1', email: 'test@example.com', role: 'PARENT' },
        },
      },
    });

    const result = await authService.refresh();

    expect(result.accessToken).toBe('renewed-access');
    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {});
  });

  it('logout: refresh tokenı JavaScript tarafında taşımaz', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });

    await authService.logout();

    expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', {});
  });
});
