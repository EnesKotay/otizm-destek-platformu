import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

import { useChildStore } from './childStore';
import { childService } from '@/services/childService';
import { userService } from '@/services/userService';

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
  setOnboardingCompleted: () => Promise<void>;
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
      setOnboardingCompleted: async () => {
        const user = get().user;
        if (!user) throw new Error('Oturum bilgisi bulunamadı');

        // Tamamlanmanın kalıcı kaynağı sunucudur. Sunucu onayı gelmeden kullanıcıyı
        // tamamlanmış saymak farklı cihazlarda onboarding'in yeniden açılmasına yol açar.
        let updatedUser: User;
        try {
          updatedUser = await userService.completeOnboarding();
        } catch (error) {
          // Eski backend sürümlerinde onboarding tamamlama endpoint'i bulunmayabilir.
          // Yalnızca 404 için yerel durumu güncelleyerek kullanıcıyı akışta kilitleme.
          if ((error as Error & { status?: number }).status !== 404) throw error;
          updatedUser = { ...user, onboardingCompleted: true };
        }
        set(s => ({
          user: s.user?.id === user.id
            ? { ...s.user, ...updatedUser, onboardingCompleted: true }
            : s.user,
          completedOnboardingIds: [...new Set([...s.completedOnboardingIds, user.id])].slice(-10),
        }));
      },
      isOnboardingCompleted: () => {
        const user = get().user;
        if (!user) return true;
        if (user.onboardingCompleted) return true;
        return get().completedOnboardingIds.includes(user.id);
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
      // Gizlilik: kullanıcının adı/e-postası/rolü gibi kişisel veriler artık tarayıcıda saklanmaz.
      // Oturum, açılışta httpOnly çerezle /auth/refresh üzerinden yeniden kurulur (bkz. AuthBootstrap).
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        completedOnboardingIds: state.completedOnboardingIds,
      }),
    }
  )
);
