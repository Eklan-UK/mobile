import { aiService } from '@/services/ai.service';
import { useQuery } from '@tanstack/react-query';

export const freeTalkKeys = {
  all: ['free-talk'] as const,
  scenarios: () => [...freeTalkKeys.all, 'scenarios'] as const,
};

/**
 * Learner-assigned Eklan Free Talk scenarios (GET /api/v1/ai/free-talk/scenarios).
 */
export function useFreeTalkScenarios(enabled = true) {
  return useQuery({
    queryKey: freeTalkKeys.scenarios(),
    queryFn: () => aiService.fetchFreeTalkScenarioSummaries(),
    enabled,
    select: (data) => data ?? [],
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 402) return false;
      return failureCount < 2;
    },
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
