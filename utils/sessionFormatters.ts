/**
 * Helpers for formatting session date/time values for display.
 */

/**
 * Format a UTC ISO string into a human-friendly date and time label.
 * e.g. "Today, Mar 31" and "2:00 PM"
 */
export function formatSessionDateTime(
  startUtc: string,
  endUtc?: string | null
): { dateLabel: string; timeLabel: string } {
  const start = new Date(startUtc);
  const now = new Date();

  const isToday =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    start.getFullYear() === tomorrow.getFullYear() &&
    start.getMonth() === tomorrow.getMonth() &&
    start.getDate() === tomorrow.getDate();

  const shortDate = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  let dateLabel: string;
  if (isToday) {
    dateLabel = `Today, ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } else if (isTomorrow) {
    dateLabel = `Tomorrow, ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } else {
    dateLabel = shortDate;
  }

  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let timeLabel = startTime;
  if (endUtc) {
    const end = new Date(endUtc);
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    timeLabel = `${startTime} - ${endTime}`;
  }

  return { dateLabel, timeLabel };
}

/**
 * Return a relative label like "Starts in 2 hrs", "Live now", "Starts in 15 min"
 */
export function formatRelativeTime(startUtc: string): string {
  const start = new Date(startUtc).getTime();
  const now = Date.now();
  const diffMs = start - now;
  const diffMin = Math.round(diffMs / (1000 * 60));
  const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));

  if (diffMs <= 0) return 'Live now';
  if (diffMin < 60) return `Starts in ${diffMin} min`;
  if (diffHrs < 24) return `Starts in ${diffHrs} hr${diffHrs !== 1 ? 's' : ''}`;
  if (diffDays < 7) return `Starts in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  return `Starts in ${diffWeeks} wk${diffWeeks !== 1 ? 's' : ''}`;
}

/**
 * Derive a display status for a session card given the backend data.
 */
export type DisplayStatus =
  | 'live'
  | 'join_window' // has meetingUrl, not yet live
  | 'upcoming'
  | 'completed'
  | 'missed';

export function deriveDisplayStatus(params: {
  sessionStatus: string;
  learnerAttendance?: string;
  startUtc: string;
  endUtc: string;
  meetingUrl?: string | null;
}): DisplayStatus {
  const { sessionStatus, learnerAttendance, startUtc, endUtc, meetingUrl } = params;
  const now = Date.now();
  const start = new Date(startUtc).getTime();
  const end = new Date(endUtc).getTime();

  // Past session
  if (now > end || sessionStatus === 'completed') {
    if (learnerAttendance === 'absent' || learnerAttendance === 'none') {
      return 'missed';
    }
    return 'completed';
  }

  // Currently live (between start and end)
  if (now >= start && now <= end) return 'live';

  // Within join window (has meetingUrl but not started yet)
  if (meetingUrl) return 'join_window';

  return 'upcoming';
}
