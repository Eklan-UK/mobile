import apiClient from '@/lib/api';
import type { BadgeStateResponse } from '@/types/badge.types';
import { logger } from '@/utils/logger';

export const userBadgesQueryKey = ['user-badges'] as const;

export async function fetchBadges(): Promise<BadgeStateResponse> {
  try {
    const response = await apiClient.get('/api/v1/badges');
    const raw = response.data;
    const parsed = raw?.data ?? raw;
    const debugPayload = {
      status: response.status,
      rawKeys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
      hasNestedData: !!raw?.data,
      badgeCount: Array.isArray(parsed?.badges) ? parsed.badges.length : null,
      featuredId: parsed?.featuredBadge?.badgeId ?? null,
      featuredIcon: parsed?.featuredBadge?.icon ?? null,
      unlockedIds: Array.isArray(parsed?.badges)
        ? parsed.badges.filter((b: { unlocked?: boolean }) => b.unlocked).map((b: { badgeId: string }) => b.badgeId)
        : [],
    };
    logger.log('[debug-bf648a] fetchBadges', debugPayload);
    // #region agent log
    fetch('http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bf648a' },
      body: JSON.stringify({
        sessionId: 'bf648a',
        location: 'badges.service.ts:fetchBadges',
        message: 'badges API response parsed',
        data: debugPayload,
        timestamp: Date.now(),
        hypothesisId: 'C',
        runId: 'post-fix',
      }),
    }).catch(() => {});
    // #endregion
    return parsed;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status ?? null;
    const debugPayload = { status, apiBase: apiClient.defaults.baseURL };
    logger.log('[debug-bf648a] fetchBadges error', debugPayload);
    // #region agent log
    fetch('http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bf648a' },
      body: JSON.stringify({
        sessionId: 'bf648a',
        location: 'badges.service.ts:fetchBadges:error',
        message: 'badges API request failed',
        data: debugPayload,
        timestamp: Date.now(),
        hypothesisId: 'B',
        runId: 'post-fix',
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }
}
