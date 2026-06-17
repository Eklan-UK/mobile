import { userBadgesQueryKey } from '@/services/badges.service';
import { userStreakQueryKey } from '@/services/metrics.service';
import type { QueryClient } from '@tanstack/react-query';

export async function invalidateLearnerActivityCaches(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: userBadgesQueryKey }),
    queryClient.invalidateQueries({ queryKey: userStreakQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['daily-focus-today'] }),
  ]);
}
