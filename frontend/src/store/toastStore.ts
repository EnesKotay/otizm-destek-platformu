import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    // Dedup: aynı mesaj + tip zaten görünüyorsa tekrar ekleme
    const existing = get().toasts;
    if (existing.some(t => t.message === message && t.type === type)) return;

    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    const duration = type === 'error' ? 6000 : 4000;
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  error:   (message: string) => useToastStore.getState().addToast(message, 'error'),
  warning: (message: string) => useToastStore.getState().addToast(message, 'warning'),
  info:    (message: string) => useToastStore.getState().addToast(message, 'info'),
};
