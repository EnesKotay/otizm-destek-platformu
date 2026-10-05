import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 dakika boyunca veriyi taze kabul et
      gcTime: 10 * 60 * 1000,   // 10 dakika boyunca cache'te tut
    },
  },
});
