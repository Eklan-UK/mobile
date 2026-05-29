import { useQuery } from '@tanstack/react-query';
import { getHomeProgressMetrics, HomeProgressMetrics } from '@/services/metrics.service';

export function useHomeProgress() {
  return useQuery<HomeProgressMetrics>({
    queryKey: ['home-progress'],
    queryFn: getHomeProgressMetrics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 0,
  });
}
