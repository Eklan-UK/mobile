import { completeDrill, getDrillById, getMyDrills } from '@/services/drill.service';
import { DrillStatus } from '@/types/drill.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Full-list page size for `my-drills` (My Plan, warm-up prefetch). MOBILE_MY_PLAN.md §4 — high `limit` for main listing. */
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
  detail: (id: string) => [...drillKeys.details(), id] as const,
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
export function useDrill(drillId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: drillKeys.detail(drillId),
    queryFn: () => getDrillById(drillId),
    enabled: enabled && !!drillId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    // Enable background refetching - will refetch when data becomes stale
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
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
      data: {
        score?: number;
        timeSpent?: number;
        answers?: any[];
      };
    }) => completeDrill(drillId, data),
    onSuccess: () => {
      // Invalidate all drill queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: drillKeys.all });
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
