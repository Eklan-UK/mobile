import apiClient from '@/lib/api';
import { Drill, DrillsResponse, DrillStatus } from '@/types/drill.types';
import { logger } from "@/utils/logger";

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
 * Fetch user's assigned drills
 */
export async function getMyDrills(params?: GetMyDrillsParams): Promise<DrillsResponse> {
  logger.log('🎯 Fetching drills with params:', params);

  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.status) queryParams.append('status', params.status);

  const url = `/api/v1/drills/learner/my-drills${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url);

  // Handle the nested response structure from backend
  // Backend returns: { code, message, data: { drills: [...], pagination: {...} } }
  const data = response.data.data || response.data;

  const result = {
    drills: data.drills || [],
    pagination: data.pagination || {
      total: data.drills?.length || 0,
      page: params?.page || 1,
      limit: params?.limit || 50,
    },
  };

  logger.log('✅ Drills fetched:', result.drills.length);
  return result;
}

/**
 * Fetch single drill by ID
 * Optionally include assignmentId to get assignment-specific data
 */
export async function getDrillById(drillId: string, assignmentId?: string): Promise<Drill> {
  const url = assignmentId
    ? `/api/v1/drills/${drillId}?assignmentId=${assignmentId}`
    : `/api/v1/drills/${drillId}`;
  
  const response = await apiClient.get(url);
  
  // Handle nested response
  const data = response.data.data || response.data;
  return data.drill || data;
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
    roleplayResults?: any;
    matchingResults?: any;
    definitionResults?: any;
    grammarResults?: any;
    sentenceWritingResults?: any;
    sentenceResults?: any;
    summaryResults?: any;
    listeningResults?: any;
    deviceInfo?: string;
    platform?: 'web' | 'ios' | 'android';
  }
): Promise<void> {
  // Add platform info if not provided
  const data = {
    ...completionData,
    platform: completionData.platform || 'ios', // Default to ios for mobile
    deviceInfo: completionData.deviceInfo || 'mobile',
  };

  await apiClient.post(`/api/v1/drills/${drillId}/complete`, data);
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

/**
 * Bookmark a word
 */
export async function bookmarkWord(word: string, drillId: string): Promise<any> {
  try {
    const response = await apiClient.post('/api/v1/bookmarks', {
      drillId,
      type: 'word',
      content: word,
      context: 'vocabulary-drill'
    });
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
      context: 'saved-drill'
    });
    return response.data;
  } catch (error: any) {
    logger.error('Failed to save drill:', error.message);
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
