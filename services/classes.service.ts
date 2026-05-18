import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';
import {
  LearnerClassListItem,
  PastSession,
  RescheduleOptionsResponse,
  ReserveSlotResponse,
} from '@/types/session.types';

/**
 * Fetch the learner's enrolled class list.
 * Optionally filter by bucket: 'today' | 'upcoming' | 'completed'
 *
 * GET /api/v1/learner/classes
 */
export async function getLearnerClasses(
  bucket?: 'today' | 'upcoming' | 'completed',
  limit = 50,
  offset = 0
): Promise<LearnerClassListItem[]> {
  logger.log('📚 Fetching learner classes', { bucket });

  const params = new URLSearchParams();
  if (bucket) params.append('bucket', bucket);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const url = `/api/v1/learner/classes?${params.toString()}`;
  const response = await apiClient.get(url);
  const data = response.data.data || response.data;

  return data.classes ?? data ?? [];
}

/**
 * Fetch the learner's past (ended) sessions.
 *
 * GET /api/v1/learner/sessions/past
 */
export async function getLearnerPastSessions(): Promise<PastSession[]> {
  logger.log('📋 Fetching past sessions');

  const response = await apiClient.get('/api/v1/learner/sessions/past');
  const data = response.data.data || response.data;

  return data.sessions ?? data ?? [];
}

/**
 * Get available reschedule slot options for a session.
 *
 * GET /api/v1/learner/sessions/:sessionId/reschedule-options
 */
export async function getRescheduleOptions(
  sessionId: string
): Promise<RescheduleOptionsResponse> {
  logger.log('🗓️ Fetching reschedule options for session', sessionId);

  const response = await apiClient.get(
    `/api/v1/learner/sessions/${sessionId}/reschedule-options`
  );
  const data = response.data.data || response.data;

  return data;
}

/**
 * Reserve a reschedule slot (creates a short-lived pessimistic hold).
 *
 * POST /api/v1/learner/sessions/:sessionId/reserve-slot
 */
export async function reserveRescheduleSlot(
  sessionId: string,
  newStartUtc: string,
  newEndUtc: string
): Promise<ReserveSlotResponse> {
  logger.log('🔒 Reserving reschedule slot', { sessionId, newStartUtc });

  const response = await apiClient.post(
    `/api/v1/learner/sessions/${sessionId}/reserve-slot`,
    { newStartUtc, newEndUtc }
  );
  const data = response.data.data || response.data;

  return data;
}

/**
 * Confirm the reschedule after reserving a slot.
 *
 * POST /api/v1/learner/sessions/:sessionId/reschedule
 */
export async function confirmReschedule(
  sessionId: string,
  newStartUtc: string,
  newEndUtc: string,
  reservationId: string,
  reservationToken: string
): Promise<void> {
  logger.log('✅ Confirming reschedule', { sessionId, newStartUtc });

  await apiClient.post(`/api/v1/learner/sessions/${sessionId}/reschedule`, {
    newStartUtc,
    newEndUtc,
    reservationId,
    reservationToken,
  });
}

/**
 * Record attendance when the learner taps "Join Session".
 *
 * POST /api/v1/learner/sessions/:sessionId/attendance
 */
export async function recordAttendance(sessionId: string): Promise<void> {
  logger.log('📝 Recording attendance for session', sessionId);

  await apiClient.post(`/api/v1/learner/sessions/${sessionId}/attendance`, {
    status: 'present',
  });
}
