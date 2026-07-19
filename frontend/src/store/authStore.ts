import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

import { useChildStore } from './childStore';
import { childService } from '@/services/childService';

import { queryClient } from '@/App';
import { API_BASE_URL } from '@/services/endpoints';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  completedOnboardingIds: string[];
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setOnboardingCompleted: () => void;
  isOnboardingCompleted: () => boolean;
  clearSession: () => void;
  logout: () => Promise<void>;
}

async function clearPrivateBrowserData() {
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('offline_request_queue');

  if ('caches' in window) {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('autism-api-') || key === 'autism-pending-sync')
        .map((key) => window.caches.delete(key)),
    );
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      completedOnboardingIds: [],
      setAuth: (user, accessToken) => {
        const previousUserId = get().user?.id;
        if (previousUserId !== user.id) {
          useChildStore.getState().clearChildren();
          childService.clearCache();
          queryClient.clear();
        }

        set({ user, accessToken, isAuthenticated: true });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setOnboardingCompleted: () => {
        const userId = get().user?.id;
        if (!userId) return;
        set(s => ({ completedOnboardingIds: [...new Set([...s.completedOnboardingIds, userId])] }));
      },
      isOnboardingCompleted: () => {
        const userId = get().user?.id;
        if (!userId) return true;
        return get().completedOnboardingIds.includes(userId);
      },
      clearSession: () => {
        useChildStore.getState().clearChildren();
        childService.clearCache();
        queryClient.clear();
        void clearPrivateBrowserData();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      logout: async () => {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
        } finally {
          get().clearSession();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        completedOnboardingIds: state.completedOnboardingIds,
      }),
    }
  )
);
