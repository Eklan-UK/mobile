import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getDrillById, getMyDrills } from '@/services/drill.service';
import { futureSelfService } from '@/services/future-self.service';
import { drillKeys } from './useDrills';

/**
 * Hook for prefetching data in the background
 * This helps reduce loading times by fetching data before it's needed
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch a drill by ID
   * Useful when user hovers/touches a drill card
   */
  const prefetchDrill = useCallback(
    (drillId: string) => {
      if (!drillId) return;

      queryClient.prefetchQuery({
        queryKey: drillKeys.detail(drillId),
        queryFn: () => getDrillById(drillId),
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    },
    [queryClient]
  );

  /**
   * Prefetch drills list
   * Useful for prefetching before navigating to drills screen
   */
  const prefetchDrills = useCallback(
    (status?: 'pending' | 'in_progress' | 'completed') => {
      queryClient.prefetchQuery({
        queryKey: drillKeys.list(status),
        queryFn: () => getMyDrills({ status, limit: 50 }),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    },
    [queryClient]
  );

  /**
   * Prefetch future self video
   * Useful for prefetching on app start or before showing future self screen
   */
  const prefetchFutureSelf = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['future-self'],
      queryFn: () => futureSelfService.getMyFutureSelf(),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  }, [queryClient]);

  /**
   * Prefetch multiple drills at once
   * Useful when showing a list of drills
   */
  const prefetchDrillsBatch = useCallback(
    (drillIds: string[]) => {
      drillIds.forEach((drillId) => {
        if (drillId) {
          prefetchDrill(drillId);
        }
      });
    },
    [prefetchDrill]
  );

  /**
   * Prefetch all common data on app start
   * Call this in the root layout or home screen
   */
  const prefetchCommonData = useCallback(() => {
    // Prefetch future self video
    prefetchFutureSelf();

    // Prefetch pending and in-progress drills (most commonly accessed)
    prefetchDrills('pending');
    prefetchDrills('in_progress');
  }, [prefetchFutureSelf, prefetchDrills]);

  return {
    prefetchDrill,
    prefetchDrills,
    prefetchFutureSelf,
    prefetchDrillsBatch,
    prefetchCommonData,
  };
}

