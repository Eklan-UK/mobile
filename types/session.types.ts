/**
 * Session and Class types for the Learner Sessions feature.
 * Mirrors the backend DTOs described in docs/NEXT_SESSION_BACKEND.md.
 */

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type LearnerAttendance = 'present' | 'late' | 'absent' | 'none';

export type ClassBucket = 'today' | 'upcoming' | 'completed';

/** DTO returned by GET /api/v1/learner/classes */
export interface LearnerClassListItem {
  classSeriesId: string;
  tutorId: string;
  title: string;
  classType: 'group' | 'individual';
  timezone: string;
  totalSessionsPlanned: number;
  scheduleDayLabels: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  recurrenceRule: 'weekly' | 'none';

  /** Which bucket this class belongs to */
  bucket: ClassBucket;
  /** Derived status: 'upcoming' | 'active' | 'completed' */
  status: 'upcoming' | 'active' | 'completed';

  /** Next upcoming session details */
  nextSessionId: string | null;
  nextSessionStartUtc: string | null;
  nextSessionEndUtc: string | null;
  nextSessionLabel: string | null;
  nextSessionIsReschedule: boolean;

  /** Meeting URL — only present within the 15-min join window */
  meetingUrl: string | null;

  /** Tutor display name */
  tutorName: string;
  /** Tutor avatar URL */
  tutorAvatarUrl?: string | null;

  /** Progress counters */
  completedSessionsCount: number;
  totalSessionsCount: number;

  sequenceNumber: number | null;
}

/** A single past session returned by GET /api/v1/learner/sessions/past */
export interface PastSession {
  sessionId: string;
  classSeriesId: string;
  tutorId: string;
  tutorName: string;
  startUtc: string;
  endUtc: string;
  sessionStatus: SessionStatus;
  learnerAttendance: LearnerAttendance;
  isReschedule: boolean;
  sequenceNumber: number | null;
  meetingUrl?: string | null;
}

/** A single available reschedule slot */
export interface RescheduleSlot {
  newStartUtc: string;
  newEndUtc: string;
  /** Whether this slot conflicts with another session */
  isAvailable: boolean;
}

/** Response from GET /api/v1/learner/sessions/:id/reschedule-options */
export interface RescheduleOptionsResponse {
  sessionId: string;
  slots: RescheduleSlot[];
}

/** Request / response for POST reserve-slot */
export interface ReserveSlotResponse {
  reservationId: string;
  reservationToken: string;
  newStartUtc: string;
  newEndUtc: string;
}
