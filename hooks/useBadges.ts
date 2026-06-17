import { useAuth } from '@/hooks/useAuth';
import { fetchBadges, userBadgesQueryKey } from '@/services/badges.service';
import type { BadgeStateResponse } from '@/types/badge.types';
import { useQuery } from '@tanstack/react-query';

export { userBadgesQueryKey };

export function useBadges(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const isLearner = user?.role === 'user';

  return useQuery<BadgeStateResponse>({
    queryKey: userBadgesQueryKey,
    queryFn: fetchBadges,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    enabled: (options?.enabled ?? true) && isLearner,
  });
}
