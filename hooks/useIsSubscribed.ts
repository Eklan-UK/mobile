import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { USER_CURRENT_KEY } from '@/hooks/useSettings';
import type { UserCurrentResponse } from '@/types/settings';
import { userHasProAccess } from '@/utils/subscription';

/**
 * Pro access for UI gating. Treats user as Pro if either auth store or React Query
 * `user-current` says so (avoids false Free tier right after login).
 */
export function useIsSubscribed(): boolean {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData<UserCurrentResponse>(USER_CURRENT_KEY);
  return userHasProAccess(user, cached?.user);
}
