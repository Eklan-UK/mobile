import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration with optimized background fetching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes - cache time (formerly cacheTime)
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: false, // Don't refetch on app focus (mobile)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts (if stale)
      // Background refetching - refetch in background when data becomes stale
      refetchInterval: false, // Disable automatic polling (use manual prefetching)
      // Use stale-while-revalidate pattern: show cached data immediately, refetch in background
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1, // Retry mutations once
    },
  },
});
