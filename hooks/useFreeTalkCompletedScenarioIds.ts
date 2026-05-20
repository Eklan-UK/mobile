import { aiService } from '@/services/ai.service';
import { useQuery } from '@tanstack/react-query';
import { freeTalkKeys } from '@/hooks/useFreeTalkScenarios';

/**
 * Scenario IDs the learner has at least one saved attempt for (server + used for due badges).
 */
export function useFreeTalkCompletedScenarioIds(enabled = true) {
  return useQuery({
    queryKey: [...freeTalkKeys.all, 'completed-scenario-ids'] as const,
    queryFn: async () => {
      const { attempts } = await aiService.fetchFreeTalkAttempts({ limit: 50 });
      return new Set(attempts.map((a) => a.scenarioId));
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
