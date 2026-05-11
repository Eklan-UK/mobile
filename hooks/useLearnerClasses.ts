import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmReschedule,
  getLearnerClasses,
  getLearnerPastSessions,
  getRescheduleOptions,
  recordAttendance,
  reserveRescheduleSlot,
} from '@/services/classes.service';
import { LearnerClassListItem } from '@/types/session.types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const classKeys = {
  all: ['learner-classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (bucket?: string) => [...classKeys.lists(), { bucket }] as const,
  past: ['learner-sessions-past'] as const,
  rescheduleOptions: (sessionId: string) =>
    ['reschedule-options', sessionId] as const,
};

// ─── Helper: pick the next imminent session across all classes ────────────────

export function pickNextLearnerSession(
  classes: LearnerClassListItem[]
): LearnerClassListItem | null {
  const candidates = classes.filter(
    (c) => c.nextSessionStartUtc && c.status !== 'completed'
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, curr) => {
    const bestTime = new Date(best.nextSessionStartUtc!).getTime();
    const currTime = new Date(curr.nextSessionStartUtc!).getTime();
    return currTime < bestTime ? curr : best;
  });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch all learner classes (no bucket filter) and derive the next session.
 */
export function useLearnerClasses() {
  const query = useQuery({
    queryKey: classKeys.list(),
    queryFn: () => getLearnerClasses(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const nextSession = query.data ? pickNextLearnerSession(query.data) : null;

  return { ...query, nextSession };
}

/**
 * Fetch learner classes filtered by bucket: 'today' | 'upcoming'
 * Used by the This Week / Upcoming tabs on the My Sessions screen.
 */
export function useLearnerClassesByBucket(bucket: 'today' | 'upcoming') {
  return useQuery({
    queryKey: classKeys.list(bucket),
    queryFn: () => getLearnerClasses(bucket),
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

/**
 * Fetch the learner's past sessions.
 */
export function useLearnerPastSessions() {
  return useQuery({
    queryKey: classKeys.past,
    queryFn: getLearnerPastSessions,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

/**
 * Fetch available reschedule slots for a specific session.
 * Only runs when sessionId is truthy.
 */
export function useRescheduleOptions(sessionId: string | null) {
  return useQuery({
    queryKey: classKeys.rescheduleOptions(sessionId ?? ''),
    queryFn: () => getRescheduleOptions(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 seconds — slots may expire quickly
  });
}

/**
 * Mutation: reserve a reschedule slot.
 */
export function useReserveRescheduleSlot() {
  return useMutation({
    mutationFn: ({
      sessionId,
      newStartUtc,
      newEndUtc,
    }: {
      sessionId: string;
      newStartUtc: string;
      newEndUtc: string;
    }) => reserveRescheduleSlot(sessionId, newStartUtc, newEndUtc),
  });
}

/**
 * Mutation: confirm the reschedule.
 * Invalidates class / session caches on success.
 */
export function useConfirmReschedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      newStartUtc,
      newEndUtc,
      reservationId,
      reservationToken,
    }: {
      sessionId: string;
      newStartUtc: string;
      newEndUtc: string;
      reservationId: string;
      reservationToken: string;
    }) =>
      confirmReschedule(
        sessionId,
        newStartUtc,
        newEndUtc,
        reservationId,
        reservationToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.all });
      queryClient.invalidateQueries({ queryKey: classKeys.past });
    },
  });
}

/**
 * Mutation: record attendance when learner joins.
 */
export function useRecordAttendance() {
  return useMutation({
    mutationFn: (sessionId: string) => recordAttendance(sessionId),
  });
}
