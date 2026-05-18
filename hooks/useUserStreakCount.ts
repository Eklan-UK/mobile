import { useQuery } from '@tanstack/react-query';
import { fetchUserStreak, StreakData, userStreakQueryKey } from '@/services/metrics.service';

/**
 * Current streak number for header pills (Home, My Plan).
 * Uses the same `/api/v1/users/streak` fetch and React Query cache as `useStreak` (profile / streak screen).
 */
export function useUserStreakCount() {
  return useQuery({
    queryKey: userStreakQueryKey,
    queryFn: fetchUserStreak,
    staleTime: 60_000,
    retry: false,
    select: (data: StreakData) => data?.currentStreak ?? 0,
  });
}
