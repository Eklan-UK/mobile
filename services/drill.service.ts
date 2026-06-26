import apiClient from '@/lib/api';
import { celebrateBadgesFromResponse } from '@/lib/badges/celebrate-badge-unlock';
import {
  CompleteDrillData,
  Drill,
  DrillsResponse,
  DrillStatus,
  KeyPhrasesResult,
  MatchingResults,
  PerformanceReviewSnapshot,
} from '@/types/drill.types';
import type {
  DrillCheckpoint,
  SaveCheckpointBody,
} from '@/types/drill-checkpoint.types';
import type {
  RoleplayCheckpoint,
  SaveRoleplayProgressBody,
} from '@/types/roleplay-progress.types';
import { normalizeDrillAssignments, shouldFetchDrillDetail } from '@/utils/drillAssignment';
import { logger } from "@/utils/logger";
import { isAxiosError } from 'axios';

/**
 * Drill API Service
 * Handles all drill-related API calls
 */

interface GetMyDrillsParams {
  limit?: number;
  page?: number;
  status?: DrillStatus;
}

/**
 * Fetch bookmarked drill IDs from GET /api/v1/bookmarks?type=drill.
 * Returns a Set of drill IDs. Fails silently — callers fall back to
 * whatever hasBookmarks the my-drills response returned.
 */
export async function getDrillBookmarkStatus(): Promise<Set<string>> {
  const response = await apiClient.get('/api/v1/bookmarks?type=drill');
  const data = response.data?.data ?? response.data;
  const bookmarks: unknown[] = Array.isArray(data?.bookmarks) ? data.bookmarks : (Array.isArray(data) ? data : []);
  const ids = (bookmarks as any[]).filter((b: any) => b.type === 'drill' && b.drillId).map((b: any) => String(b.drillId));
  return new Set(ids);
}

/**
 * Fetch user's assigned drills.
 * Bookmark state is resolved authoritatively: a parallel call to
 * GET /api/v1/bookmarks?type=drill overrides the `hasBookmarks` field
 * returned by my-drills so that toggling a bookmark and refetching
 * always reflects the real state in MongoDB.
 */
export async function getMyDrills(params?: GetMyDrillsParams): Promise<DrillsResponse> {
  logger.log('🎯 Fetching drills with params:', params);

  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.status) queryParams.append('status', params.status);

  const url = `/api/v1/drills/learner/my-drills${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  // Fetch drills and bookmark status in parallel. Bookmark status is non-critical
  // — if it fails we keep whatever hasBookmarks the drill list returned.
  const [response, bookmarkedIds] = await Promise.all([
    apiClient.get(url),
    getDrillBookmarkStatus().catch(() => null),
  ]);

  // Handle the nested response structure from backend
  // Backend returns: { code, message, data: { drills: [...], pagination: {...} } }
  const data = response.data.data || response.data;

  const rawDrills = Array.isArray(data.drills) ? data.drills : [];
  const normalized = normalizeDrillAssignments(rawDrills);

  // Override hasBookmarks with the authoritative set from the dedicated endpoint
  if (bookmarkedIds !== null) {
    for (const assignment of normalized) {
      assignment.hasBookmarks = bookmarkedIds.has(assignment.drill._id);
    }
  }

  const result = {
    drills: normalized,
    pagination: data.pagination || {
      total: rawDrills.length,
      page: params?.page || 1,
      limit: params?.limit ?? rawDrills.length,
    },
  };

  logger.log('✅ Drills fetched:', result.drills.length);
  return result;
}

/**
 * Fetch single drill by ID
 * Optionally include assignmentId to get assignment-specific data
 */
export async function getDrillById(
  drillId: string,
  assignmentId?: string,
  options?: { drillType?: string }
): Promise<Drill> {
  if (options?.drillType && !shouldFetchDrillDetail({ type: options.drillType })) {
    throw new DrillDetailNotAvailableError(
      'This practice mode does not use drill detail fetch.'
    );
  }

  const url = assignmentId
    ? `/api/v1/drills/${drillId}?assignmentId=${assignmentId}`
    : `/api/v1/drills/${drillId}`;

  try {
    const response = await apiClient.get(url);
    const data = response.data.data || response.data;
    return data.drill || data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new DrillNotFoundError(drillId, assignmentId);
    }
    throw error;
  }
}

export class DrillNotFoundError extends Error {
  readonly drillId: string;
  readonly assignmentId?: string;

  constructor(drillId: string, assignmentId?: string) {
    super('Drill not found');
    this.name = 'DrillNotFoundError';
    this.drillId = drillId;
    this.assignmentId = assignmentId;
  }
}

export class DrillDetailNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrillDetailNotAvailableError';
  }
}

/**
 * Mark drill as complete
 * Matches front-end API format: /api/v1/drills/{drillId}/complete
 */
export async function completeDrill(
  drillId: string,
  completionData: {
    drillAssignmentId?: string; // Optional - will be auto-detected if not provided
    score: number;
    timeSpent: number;
    answers?: any[];
    vocabularyResults?: any;
    pronunciationResults?: any;
    roleplayResults?: any;
    matchingResults?: MatchingResults;
    definitionResults?: any;
    grammarResults?: any;
    sentenceWritingResults?: any;
    sentenceResults?: any;
    summaryResults?: any;
    listeningResults?: any;
    fillBlankResults?: any;
    keyPhrasesResults?: KeyPhrasesResult;
    performanceReviewSnapshot?: PerformanceReviewSnapshot;
    deviceInfo?: string;
    platform?: 'web' | 'ios' | 'android';
  }
): Promise<CompleteDrillData> {
  // Add platform info if not provided
  const data = {
    ...completionData,
    platform: completionData.platform || 'ios', // Default to ios for mobile
    deviceInfo: completionData.deviceInfo || 'mobile',
  };

  const response = await apiClient.post(`/api/v1/drills/${drillId}/complete`, data);
  celebrateBadgesFromResponse(response.data);
  const result = response.data?.data ?? response.data;
  return result as CompleteDrillData;
}

function roleplayProgressQueryString(query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.append(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * GET saved item-drill checkpoint for a My Plan assignment.
 */
export async function getCheckpoint(
  drillId: string,
  assignmentId: string
): Promise<DrillCheckpoint | null> {
  const url = `/api/v1/drills/${drillId}/checkpoint?assignmentId=${assignmentId}`;
  const response = await apiClient.get(url, {
    headers: { 'Cache-Control': 'no-store' },
  });
  const data = response.data?.data ?? response.data;
  return (data?.checkpoint as DrillCheckpoint | null) ?? null;
}

/**
 * POST item-drill checkpoint (every 5 completed items).
 */
export async function saveCheckpoint(
  drillId: string,
  body: SaveCheckpointBody
): Promise<void> {
  await apiClient.post(`/api/v1/drills/${drillId}/checkpoint`, body);
}

/**
 * DELETE item-drill checkpoint after successful completion.
 * Never throws — failures are logged only.
 */
export async function clearCheckpoint(
  drillId: string,
  assignmentId: string
): Promise<void> {
  try {
    const url = `/api/v1/drills/${drillId}/checkpoint?assignmentId=${assignmentId}`;
    await apiClient.delete(url);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to clear drill checkpoint (non-critical):', message);
  }
}

/**
 * GET saved roleplay checkpoint for assignment or weekly challenge.
 */
export async function getRoleplayProgress(
  drillId: string,
  query: Record<string, string>
): Promise<RoleplayCheckpoint | null> {
  const url = `/api/v1/drills/${drillId}/roleplay-progress${roleplayProgressQueryString(query)}`;
  const response = await apiClient.get(url);
  const data = response.data?.data ?? response.data;
  return (data?.progress as RoleplayCheckpoint | null) ?? null;
}

/**
 * POST roleplay checkpoint (Continue Later).
 */
export async function saveRoleplayProgress(
  drillId: string,
  body: SaveRoleplayProgressBody
): Promise<void> {
  await apiClient.post(`/api/v1/drills/${drillId}/roleplay-progress`, body);
}

/**
 * DELETE roleplay checkpoint (submit, restart, stale progress).
 */
export async function clearRoleplayProgress(
  drillId: string,
  query: Record<string, string>
): Promise<void> {
  const url = `/api/v1/drills/${drillId}/roleplay-progress${roleplayProgressQueryString(query)}`;
  await apiClient.delete(url);
}

/**
 * Start a drill attempt (optional - attempts are created on completion)
 * This is a no-op if the endpoint doesn't exist (404)
 */
export async function startDrillAttempt(drillId: string): Promise<{ attemptId?: string }> {
  try {
    const response = await apiClient.post(`/api/v1/drills/${drillId}/start`);
    return response.data || {};
  } catch (error: any) {
    // If endpoint doesn't exist (404), that's fine - attempts are created on completion
    if (error.response?.status === 404) {
      logger.log('Start attempt endpoint not available, will create attempt on completion');
      return {};
    }
    // For other errors, log but don't throw - this is optional
    logger.warn('Failed to start attempt tracking (non-critical):', error.message);
    return {};
  }
}

/**
 * Fetch attempts for a specific drill assignment
 * Used to show read-only submissions for completed drills
 */
export async function getAssignmentAttempts(assignmentId: string): Promise<{
  assignment: any;
  attempts: any[];
  latestAttempt: any | null;
  pagination?: any;
}> {
  const response = await apiClient.get(`/api/v1/drills/assignments/${assignmentId}/attempts`);
  const data = response.data.data || response.data;

  return {
    assignment: data.assignment,
    attempts: data.attempts || [],
    latestAttempt: data.latestAttempt || null,
    pagination: data.pagination,
  };
}

export type BookmarkWordOptions = {
  translation?: string;
  context?: string;
  type?: 'word' | 'sentence';
};

/**
 * Bookmark a word or sentence from a drill (server dedupes by user + drill + content).
 */
export async function bookmarkWord(
  word: string,
  drillId: string,
  opts?: BookmarkWordOptions
): Promise<any> {
  try {
    const response = await apiClient.post('/api/v1/bookmarks', {
      drillId,
      type: opts?.type ?? 'word',
      content: word,
      ...(opts?.translation != null && opts.translation !== ''
        ? { translation: opts.translation }
        : {}),
      ...(opts?.context != null && opts.context !== '' ? { context: opts.context } : {}),
    });
    celebrateBadgesFromResponse(response.data);
    return response.data;
  } catch (error: any) {
    logger.error('Failed to bookmark word:', error.message);
    throw error;
  }
}

/**
 * Save a drill (bookmark it)
 */
export async function saveDrill(drillId: string): Promise<any> {
  try {
    const response = await apiClient.post('/api/v1/bookmarks', {
      drillId,
      type: 'drill',
      content: drillId,
    });
    celebrateBadgesFromResponse(response.data);
    return response.data;
  } catch (error: any) {
    logger.error('Failed to save drill:', error.message);
    throw error;
  }
}

/**
 * Remove a drill-level bookmark by drillId (web parity).
 */
export async function unsaveDrillByDrillId(drillId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/bookmarks/by-drill/${drillId}`);
  } catch (error: any) {
    logger.error('Failed to remove drill bookmark:', error.message);
    throw error;
  }
}

/**
 * Unsave a drill (remove bookmark)
 */
export async function unsaveDrill(bookmarkId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/bookmarks/${bookmarkId}`);
  } catch (error: any) {
    logger.error('Failed to unsave drill:', error.message);
    throw error;
  }
}

/**
 * Get all saved drills (bookmarks with type='drill')
 */
export async function getSavedDrills(): Promise<any[]> {
  try {
    const response = await apiClient.get('/api/v1/bookmarks');
    const data = response.data.data || response.data;
    const bookmarks = data.bookmarks || [];
    // Filter for drill bookmarks
    return bookmarks.filter((bookmark: any) => bookmark.type === 'drill');
  } catch (error: any) {
    logger.error('Failed to get saved drills:', error.message);
    throw error;
  }
}

/**
 * Check if a drill is saved
 */
export async function checkDrillSaved(drillId: string): Promise<{ isSaved: boolean; bookmarkId?: string }> {
  try {
    const savedDrills = await getSavedDrills();
    const bookmark = savedDrills.find((b: any) => b.drillId === drillId);
    return {
      isSaved: !!bookmark,
      bookmarkId: bookmark?._id || bookmark?.id,
    };
  } catch (error: any) {
    logger.error('Failed to check if drill is saved:', error.message);
    return { isSaved: false };
  }
}
