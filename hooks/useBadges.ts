import { useAuth } from '@/hooks/useAuth';
import { fetchBadges, userBadgesQueryKey } from '@/services/badges.service';
import type { BadgeStateResponse } from '@/types/badge.types';
import { logger } from '@/utils/logger';
import { useQuery } from '@tanstack/react-query';

export { userBadgesQueryKey };

export function useBadges(options?: { enabled?: boolean }) {
  const { user, isAuthenticated } = useAuth();
  const isLearner = user?.role === 'user';

  const enabled = (options?.enabled ?? true) && isLearner;

  const query = useQuery<BadgeStateResponse>({
    queryKey: userBadgesQueryKey,
    queryFn: fetchBadges,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    enabled,
  });

  const debugPayload = {enabled,isAuthenticated,userRole:user?.role??null,isLearner,isLoading:query.isLoading,isFetching:query.isFetching,isError:query.isError,status:query.status,fetchStatus:query.fetchStatus,badgeCount:query.data?.badges?.length??null,featuredId:query.data?.featuredBadge?.badgeId??null,errorStatus:(query.error as {response?:{status?:number}}|null)?.response?.status??null};
  logger.log('[debug-bf648a] useBadges', debugPayload);
  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bf648a'},body:JSON.stringify({sessionId:'bf648a',location:'useBadges.ts:hook',message:'useBadges state',data:debugPayload,timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion

  return query;
}
