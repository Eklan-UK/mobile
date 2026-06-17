import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getDrillById, getMyDrills } from '@/services/drill.service';
import { fetchBadges, userBadgesQueryKey } from '@/services/badges.service';
import { futureSelfService } from '@/services/future-self.service';
import type { DrillAssignment } from '@/types/drill.types';
import { shouldFetchDrillDetail } from '@/utils/drillAssignment';
import { drillKeys, MY_DRILLS_FULL_LIST_LIMIT } from './useDrills';
import { isAxiosError } from 'axios';

function shouldRetryDrillFetch(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 404) {
    return false;
  }
  return failureCount < 2;
}

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
    (drillId: string, assignmentId?: string) => {
      if (!drillId) return;

      queryClient.prefetchQuery({
        queryKey: drillKeys.detail(drillId, assignmentId),
        queryFn: () => getDrillById(drillId, assignmentId),
        staleTime: 1000 * 60 * 10, // 10 minutes
        retry: shouldRetryDrillFetch,
      });
    },
    [queryClient]
  );

  const prefetchDrillAssignment = useCallback(
    (assignment: DrillAssignment) => {
      const { drill } = assignment;
      if (!drill?._id || !shouldFetchDrillDetail(drill)) return;
      prefetchDrill(drill._id, assignment.assignmentId);
    },
    [prefetchDrill]
  );

  /**
   * Prefetch drills list
   * Useful for prefetching before navigating to drills screen
   */
  const prefetchDrills = useCallback(
    (status?: 'pending' | 'in_progress' | 'completed') => {
      queryClient.prefetchQuery({
        queryKey: drillKeys.list(status, MY_DRILLS_FULL_LIST_LIMIT),
        queryFn: () => getMyDrills({ status, limit: MY_DRILLS_FULL_LIST_LIMIT }),
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
   * Prefetch learner badges for gallery / home header
   */
  const prefetchBadges = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: userBadgesQueryKey,
      queryFn: fetchBadges,
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  /**
   * Prefetch all common data on app start
   * Call this in the root layout or home screen
   */
  const prefetchCommonData = useCallback(() => {
    // Prefetch future self video
    prefetchFutureSelf();

    // Prefetch learner badges
    prefetchBadges();

    // Prefetch the full no-filter drill list that plan.tsx and home use.
    // Status-filtered prefetches created separate cache keys that were never
    // consumed by any screen and triggered unnecessary extra API calls.
    prefetchDrills(undefined);
  }, [prefetchFutureSelf, prefetchBadges, prefetchDrills]);

  return {
    prefetchDrill,
    prefetchDrillAssignment,
    prefetchDrills,
    prefetchFutureSelf,
    prefetchBadges,
    prefetchDrillsBatch,
    prefetchCommonData,
  };
}

