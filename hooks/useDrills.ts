import { invalidateLearnerActivityCaches } from '@/hooks/invalidateLearnerActivityCaches';
import { completeDrill, getDrillById, getMyDrills } from '@/services/drill.service';
import { DrillStatus } from '@/types/drill.types';
import { shouldFetchDrillDetail } from '@/utils/drillAssignment';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

/** Full-list page size for `my-drills` (My Plan, warm-up prefetch). docs/MOBILE_MY_PLAN.md §4 — high `limit` for main listing. */
export const MY_DRILLS_FULL_LIST_LIMIT = 200;

/**
 * Query keys for drill-related queries
 */
export const drillKeys = {
  all: ['drills'] as const,
  lists: () => [...drillKeys.all, 'list'] as const,
  list: (status?: DrillStatus, limit?: number) =>
    [...drillKeys.lists(), { status, limit }] as const,
  details: () => [...drillKeys.all, 'detail'] as const,
  detail: (id: string, assignmentId?: string) =>
    [...drillKeys.details(), id, assignmentId ?? ''] as const,
};

/**
 * Hook to fetch user's assigned drills
 * @param status - Filter by drill status (optional)
 * @param limit - Max drills to fetch; omit or pass `undefined` to let the API apply its default (no `limit` query param)
 */
export function useDrills(status?: DrillStatus, limit?: number) {
  return useQuery({
    queryKey: drillKeys.list(status, limit),
    queryFn: () => getMyDrills({ status, limit }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Enable background refetching - will refetch when data becomes stale
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook to fetch a single drill by ID
 * @param drillId - The drill ID to fetch
 * @param enabled - Whether the query should run (default: true)
 */
export function useDrill(
  drillId: string,
  options?: { enabled?: boolean; assignmentId?: string; drillType?: string }
) {
  const enabled = options?.enabled ?? true;
  const canFetch =
    !!drillId &&
    shouldFetchDrillDetail(
      options?.drillType ? { type: options.drillType } : { type: undefined }
    );

  return useQuery({
    queryKey: drillKeys.detail(drillId, options?.assignmentId),
    queryFn: () => getDrillById(drillId, options?.assignmentId),
    enabled: enabled && canFetch,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Invalidates all drill-related caches after a drill is completed.
 * Call this after every successful completeDrill() API call.
 */
export async function invalidateDrillCaches(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: drillKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['home-progress'] }),
    queryClient.invalidateQueries({ queryKey: ['learner-drills-profile'] }),
    queryClient.invalidateQueries({ queryKey: ['confidence-metrics'] }),
    invalidateLearnerActivityCaches(queryClient),
  ]);
}

/**
 * Hook to complete a drill
 * Invalidates drill queries on success
 */
export function useCompleteDrill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      drillId,
      data,
    }: {
      drillId: string;
      data: Parameters<typeof completeDrill>[1];
    }) => completeDrill(drillId, data),
    onSuccess: () => {
      void invalidateDrillCaches(queryClient);
    },
  });
}

/**
 * Hook to manually refetch drills
 */
export function useRefreshDrills() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: drillKeys.lists() });
  };
}
