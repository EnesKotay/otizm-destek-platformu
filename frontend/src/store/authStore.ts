import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

import { useChildStore } from './childStore';
import { childService } from '@/services/childService';

import { queryClient } from '@/App';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  completedOnboardingIds: string[];
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setOnboardingCompleted: () => void;
  isOnboardingCompleted: () => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      completedOnboardingIds: [],
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
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
      logout: () => {
        useChildStore.getState().clearChildren();
        childService.clearCache();
        queryClient.clear();
        
        // Tüm yerel verileri (önbellekleri) temizle (hesap izolasyonu için)
        localStorage.clear();

        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
