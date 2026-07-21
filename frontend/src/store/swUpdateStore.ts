import { create } from 'zustand';

interface SwUpdateStore {
  updateAvailable: boolean;
  setUpdateAvailable: (value: boolean) => void;
}

export const useSwUpdateStore = create<SwUpdateStore>((set) => ({
  updateAvailable: false,
  setUpdateAvailable: (value) => set({ updateAvailable: value }),
}));
