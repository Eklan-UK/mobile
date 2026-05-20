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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
