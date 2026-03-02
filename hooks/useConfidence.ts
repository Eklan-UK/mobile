import { useQuery } from '@tanstack/react-query';
import { getConfidenceMetrics, ConfidenceMetrics } from '@/services/metrics.service';
import { useMemo } from 'react';

export function useConfidence() {
  const query = useQuery<ConfidenceMetrics>({
    queryKey: ['confidence-metrics'],
    queryFn: getConfidenceMetrics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const weeklyChange = useMemo(() => {
    const history = query.data?.history;
    if (!history || history.length < 2) return 0;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const baseline =
      history.find((h) => new Date(h.computedAt) >= oneWeekAgo) ?? history[0];
    const current = query.data!.confidenceScore;

    return Math.round(current - baseline.score);
  }, [query.data]);

  return { ...query, weeklyChange };
}
