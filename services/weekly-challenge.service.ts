import apiClient from '@/lib/api';
import type {
  WeeklyChallengeHistoryResponse,
  WeeklyChallengeListResponse,
  WeeklyChallengeItemResponse,
  WeeklyChallengeCompleteResponse,
} from '@/types/weekly-challenge.types';

/**
 * Weekly Challenge API Service
 * Base path: /api/v1/learner/weekly-challenge
 */

/**
 * GET /learner/weekly-challenge/history
 * Fetches all challenges, newest first. Also triggers current-week generation on the backend.
 */
export async function getWeeklyChallengeHistory(): Promise<WeeklyChallengeListResponse[]> {
  const response = await apiClient.get<{ data: WeeklyChallengeHistoryResponse }>(
    '/api/v1/learner/weekly-challenge/history',
  );
  const data = response.data?.data ?? (response.data as any);
  return data?.challenges ?? [];
}

/**
 * GET /learner/weekly-challenge
 * Get one week, or the current week when weekStartDate is omitted.
 */
export async function getWeeklyChallenge(
  weekStartDate?: string,
): Promise<WeeklyChallengeListResponse | null> {
  const params = weekStartDate ? { weekStartDate } : undefined;
  const response = await apiClient.get('/api/v1/learner/weekly-challenge', { params });
  return response.data?.data ?? response.data ?? null;
}

/**
 * GET /learner/weekly-challenge/items/{itemId}
 * Fetch full drill content for practice.
 * itemId can be numeric index (0, 1, …) or composite "{challengeId}-{index}".
 */
export async function getWeeklyChallengeItem(
  itemId: string | number,
  weekStartDate?: string,
): Promise<WeeklyChallengeItemResponse | null> {
  const params = weekStartDate ? { weekStartDate } : undefined;
  const response = await apiClient.get(
    `/api/v1/learner/weekly-challenge/items/${itemId}`,
    { params },
  );
  return response.data?.data ?? response.data ?? null;
}

/**
 * POST /learner/weekly-challenge/items/{itemId}/complete
 * Mark a drill item complete. itemId should be the numeric index.
 */
export async function completeWeeklyChallengeItem(
  itemId: string | number,
  data?: { score?: number; weekStartDate?: string },
): Promise<WeeklyChallengeCompleteResponse> {
  const numericIndex =
    typeof itemId === 'string'
      ? parseInt(itemId.split('-').pop() ?? '0', 10)
      : itemId;

  const body = data?.score != null ? { score: data.score } : undefined;
  const params = data?.weekStartDate ? { weekStartDate: data.weekStartDate } : undefined;

  const response = await apiClient.post(
    `/api/v1/learner/weekly-challenge/items/${numericIndex}/complete`,
    body,
    { params },
  );
  return response.data?.data ?? response.data;
}
