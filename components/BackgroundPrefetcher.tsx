import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useAuthStore } from '@/store/auth-store';

/**
 * Component that handles background prefetching of data
 * Prefetches data when app comes to foreground and on initial load
 */
export function BackgroundPrefetcher() {
  const { prefetchCommonData, prefetchDrills } = usePrefetch();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Prefetch common data on initial mount
    prefetchCommonData();

    // Handle app state changes for background prefetching
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - prefetch stale data
        prefetchCommonData();
        // Prefetch pending and in-progress drills (most commonly accessed)
        prefetchDrills('pending');
        prefetchDrills('in_progress');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, prefetchCommonData, prefetchDrills]);

  return null;
}

