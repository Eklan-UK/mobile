import apiClient from '@/lib/api';
import type { LearningJourneyPartId } from '@/domain/learning-journey/learning-journey.catalog';
import { logger } from '@/utils/logger';

/**
 * Fetch the learner's active mission enrollments.
 *
 * GET /api/v1/learning-journey/enrollments/me
 */
export async function getMyMissionEnrollments(): Promise<LearningJourneyPartId[]> {
  logger.log('📋 Fetching mission enrollments');

  const response = await apiClient.get('/api/v1/learning-journey/enrollments/me');
  const data = response.data.data ?? response.data;

  return data.enrolledParts ?? [];
}
