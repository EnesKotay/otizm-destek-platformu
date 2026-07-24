import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types';

const completeOnboarding = vi.fn();
const clearChildren = vi.fn();
const clearChildCache = vi.fn();
const clearQueryCache = vi.fn();

vi.mock('@/services/userService', () => ({
  userService: { completeOnboarding },
}));

vi.mock('@/services/childService', () => ({
  childService: { clearCache: clearChildCache },
}));

vi.mock('@/store/childStore', () => ({
  useChildStore: {
    getState: () => ({ clearChildren }),
  },
}));

vi.mock('@/App', () => ({
  queryClient: { clear: clearQueryCache },
}));

vi.unmock('@/store/authStore');
const { useAuthStore } = await import('@/store/authStore');

const user: User = {
  id: 'user-1',
  email: 'parent@example.com',
  fullName: 'Test Parent',
  role: 'PARENT',
  verified: true,
  kvkkConsent: true,
  onboardingCompleted: false,
  createdAt: '2026-07-24T00:00:00Z',
};

describe('authStore onboarding completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      completedOnboardingIds: [],
    });
  });

  it('does not mark onboarding complete when the server write fails', async () => {
    completeOnboarding.mockRejectedValueOnce(new Error('network error'));
    useAuthStore.getState().setAuth(user, 'token');

    await expect(useAuthStore.getState().setOnboardingCompleted()).rejects.toThrow('network error');

    expect(useAuthStore.getState().user?.onboardingCompleted).toBe(false);
    expect(useAuthStore.getState().completedOnboardingIds).toEqual([]);
    expect(useAuthStore.getState().isOnboardingCompleted()).toBe(false);
  });

  it('marks onboarding complete only after the server confirms it', async () => {
    completeOnboarding.mockResolvedValueOnce({ ...user, onboardingCompleted: true });
    useAuthStore.getState().setAuth(user, 'token');

    await useAuthStore.getState().setOnboardingCompleted();

    expect(completeOnboarding).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().user?.onboardingCompleted).toBe(true);
    expect(useAuthStore.getState().completedOnboardingIds).toEqual([user.id]);
    expect(useAuthStore.getState().isOnboardingCompleted()).toBe(true);
  });

  it('keeps older backend versions usable when only the completion endpoint is missing', async () => {
    const endpointMissing = Object.assign(new Error('not found'), { status: 404 });
    completeOnboarding.mockRejectedValueOnce(endpointMissing);
    useAuthStore.getState().setAuth(user, 'token');

    await useAuthStore.getState().setOnboardingCompleted();

    expect(useAuthStore.getState().user?.onboardingCompleted).toBe(true);
    expect(useAuthStore.getState().completedOnboardingIds).toEqual([user.id]);
  });
});
