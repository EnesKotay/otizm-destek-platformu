import '@testing-library/jest-dom';
import { vi } from 'vitest';

// App.tsx (QueryClient) ve authStore sirkler import zincirine girmemek için mock
vi.mock('@/App', () => ({ queryClient: { invalidateQueries: vi.fn() } }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(vi.fn(() => ({})), { getState: vi.fn(() => ({ accessToken: null })) }),
}));
vi.mock('@/store/childStore', () => ({
  useChildStore: vi.fn(() => ({ children: [], selectedChild: null, setChildren: vi.fn(), setSelectedChild: vi.fn() })),
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
const globalTarget = typeof window !== 'undefined' ? window : globalThis;

Object.defineProperty(globalTarget, 'localStorage', { value: localStorageMock });

// matchMedia mock
Object.defineProperty(globalTarget, 'matchMedia', {
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalTarget as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}));
