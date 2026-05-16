import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { USER_CURRENT_KEY } from '@/hooks/useSettings';
import type { UserCurrentResponse } from '@/types/settings';
import { isProSubscriber } from '@/utils/subscription';

/**
 * Pro access for UI gating. Uses the freshest of React Query `user-current` or auth store user
 * so Settings / profile refetches unlock tabs before the next `checkSession` run.
 */
export function useIsSubscribed(): boolean {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData<UserCurrentResponse>(USER_CURRENT_KEY);
  const merged = cached?.user ?? user;
  return isProSubscriber(merged);
}
