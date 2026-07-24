import { create } from 'zustand';
import type { Child } from '@/types';

interface ChildState {
  children: Child[];
  selectedChild: Child | null;
  setChildren: (children: Child[]) => void;
  setSelectedChild: (child: Child | null) => void;
  addChild: (child: Child) => void;
  updateChild: (child: Child) => void;
  removeChild: (id: string) => void;
  clearChildren: () => void;
}

export const useChildStore = create<ChildState>()((set) => ({
  children: [],
  selectedChild: null,
  setChildren: (children) =>
    set((state) => {
      const selectedChild = state.selectedChild
        ? children.find((child) => child.id === state.selectedChild?.id) ?? null
        : null;

      return {
        children,
        selectedChild: selectedChild ?? children[0] ?? null,
      };
    }),
  setSelectedChild: (child) => set({ selectedChild: child }),
  addChild: (child) =>
    set((state) => ({
      children: state.children.some((c) => c.id === child.id)
        ? state.children.map((c) => (c.id === child.id ? child : c))
        : [...state.children, child],
    })),
  updateChild: (child) =>
    set((state) => ({
      children: state.children.map((c) => (c.id === child.id ? child : c)),
      selectedChild: state.selectedChild?.id === child.id ? child : state.selectedChild,
    })),
  removeChild: (id) =>
    set((state) => ({
      children: state.children.filter((c) => c.id !== id),
      selectedChild: state.selectedChild?.id === id ? null : state.selectedChild,
    })),
  clearChildren: () => set({ children: [], selectedChild: null }),
}));
