import { useQuery } from '@tanstack/react-query';
import { getProgressScorecard } from '@/services/metrics.service';
import type { ProgressScorecardMetrics } from '@/types/progress-scorecard.types';
import { useAuthStore } from '@/store/auth-store';

export const progressScorecardQueryKey = ['progress-scorecard'] as const;

export function useProgressScorecard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  return useQuery<ProgressScorecardMetrics>({
    queryKey: progressScorecardQueryKey,
    queryFn: getProgressScorecard,
    enabled: isAuthenticated && hasHydrated,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function getConfidenceLabelColor(
  label: ProgressScorecardMetrics['confidenceLabel'] | undefined
): string {
  switch (label) {
    case 'Excellent':          return '#16a34a';
    case 'Very Good':          return '#22c55e';
    case 'Good':               return '#84cc16';
    case 'Average':            return '#eab308';
    case 'Developing':         return '#f97316';
    case 'Needs Improvement':  return '#ef4444';
    default:                   return '#6b7280';
  }
}
