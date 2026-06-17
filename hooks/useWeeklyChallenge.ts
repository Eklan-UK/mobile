import {
  getWeeklyChallengeHistory,
  getWeeklyChallenge,
  getWeeklyChallengeItem,
  completeWeeklyChallengeItem,
} from '@/services/weekly-challenge.service';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

const GENERATING_POLL_MS = 3000;
const STALE_TIME_MS = 1000 * 60 * 2; // 2 minutes

// ─── Query keys ───────────────────────────────────────────────────────────────

export const weeklyChallengeKeys = {
  all: ['weeklyChallenge'] as const,
  history: () => [...weeklyChallengeKeys.all, 'history'] as const,
  current: () => [...weeklyChallengeKeys.all, 'current'] as const,
  week: (weekStartDate: string) =>
    [...weeklyChallengeKeys.all, 'week', weekStartDate] as const,
  item: (weekStartDate: string, index: number) =>
    [...weeklyChallengeKeys.all, 'item', weekStartDate, index] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch all challenges for the learner (newest first).
 * Calling this also auto-triggers current-week generation on the backend.
 * Polls every 3 s while any challenge is still generating.
 */
export function useWeeklyChallengeHistory(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: weeklyChallengeKeys.history(),
    queryFn: getWeeklyChallengeHistory,
    enabled: options?.enabled ?? true,
    staleTime: STALE_TIME_MS,
    refetchInterval: (query) => {
      const challenges = query.state.data ?? [];
      return challenges.some((c) => c.status === 'generating') ? GENERATING_POLL_MS : false;
    },
  });
}

/**
 * Fetch a specific week, or the current week when weekStartDate is omitted.
 * Polls every 3 s while status === 'generating'.
 */
export function useWeeklyChallengeWeek(
  weekStartDate?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: weekStartDate
      ? weeklyChallengeKeys.week(weekStartDate)
      : weeklyChallengeKeys.current(),
    queryFn: () => getWeeklyChallenge(weekStartDate),
    enabled: options?.enabled ?? true,
    staleTime: STALE_TIME_MS,
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? GENERATING_POLL_MS : false,
  });
}

/**
 * Fetch full drill content for a specific item.
 */
export function useWeeklyChallengeItem(
  index: number,
  weekStartDate?: string,
  options?: { enabled?: boolean; itemId?: string },
) {
  return useQuery({
    queryKey: weeklyChallengeKeys.item(weekStartDate ?? '', index),
    queryFn: () => {
      const itemId = options?.itemId ?? index;
      return getWeeklyChallengeItem(itemId, weekStartDate);
    },
    enabled: (options?.enabled ?? true) && index >= 0,
  });
}

// ─── Completion helper ────────────────────────────────────────────────────────

/**
 * Complete a weekly challenge item and refetch all weekly challenge queries.
 * Call this from drill screens instead of completeDrill() when in WC mode.
 */
export async function completeWeeklyChallengeItemAndRefetch(
  queryClient: QueryClient,
  itemId: string | number,
  data?: { score?: number; weekStartDate?: string },
) {
  const response = await completeWeeklyChallengeItem(itemId, data);
  await queryClient.refetchQueries({ queryKey: weeklyChallengeKeys.all });
  return response;
}

/**
 * React Query mutation wrapper for completing a weekly challenge item.
 */
export function useCompleteWeeklyChallengeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      score,
      weekStartDate,
    }: {
      itemId: string | number;
      score?: number;
      weekStartDate?: string;
    }) => completeWeeklyChallengeItem(itemId, { score, weekStartDate }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: weeklyChallengeKeys.all });
    },
  });
}
