import { useQuery } from '@tanstack/react-query';
import { getPronunciationMetrics, PronunciationMetrics } from '@/services/metrics.service';
import { useMemo } from 'react';

export function usePronunciation() {
  const query = useQuery<PronunciationMetrics>({
    queryKey: ['pronunciation-metrics'],
    queryFn: getPronunciationMetrics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const weeklyChange = useMemo(() => {
    const history = query.data?.history;
    if (!history || history.length < 2) return 0;

    const sorted = [...history].sort(
      (a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime()
    );
    const latest = sorted[0].score;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const baseline =
      sorted.find((h) => new Date(h.computedAt) <= oneWeekAgo) ?? sorted[sorted.length - 1];

    return Math.round(latest - baseline.score);
  }, [query.data]);

  return { ...query, weeklyChange };
}
