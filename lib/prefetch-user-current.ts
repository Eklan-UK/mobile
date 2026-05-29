import { queryClient } from '@/lib/query-client';
import { USER_CURRENT_KEY } from '@/hooks/useSettings';
import { settingsService } from '@/services/settings.service';
import type { UserCurrentResponse } from '@/types/settings';
import { logger } from '@/utils/logger';

/**
 * Fetch `/users/current` into React Query before post-auth navigation so Pro gating
 * matches the server on first paint.
 */
export async function prefetchUserCurrent(): Promise<UserCurrentResponse | null> {
  try {
    return await queryClient.fetchQuery({
      queryKey: USER_CURRENT_KEY,
      queryFn: () => settingsService.getCurrentUser(),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.warn('[auth] prefetchUserCurrent failed (non-fatal):', error);
    return null;
  }
}
