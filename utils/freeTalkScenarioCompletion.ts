import { format } from 'date-fns';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** End of the completion calendar day (23:59:59.999), matching backend / web. */
export function freeTalkCompletionDateEnd(value: string | Date): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return d;
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isFreeTalkScenarioExpired(
  completionDate: string | Date | null | undefined
): boolean {
  if (completionDate == null) return false;
  return Date.now() > freeTalkCompletionDateEnd(completionDate).getTime();
}

/**
 * Incomplete scenario within 24 hours of its completion deadline (not yet expired).
 * Past-deadline rows are filtered/purged server-side and typically never reach the client.
 */
export function isFreeTalkScenarioDueSoon(
  completionDate: string | Date | null | undefined,
  completed: boolean
): boolean {
  if (completed || completionDate == null) return false;
  const end = freeTalkCompletionDateEnd(completionDate);
  const now = Date.now();
  const endMs = end.getTime();
  if (Number.isNaN(endMs)) return false;
  return now <= endMs && endMs - now <= ONE_DAY_MS;
}

export function formatFreeTalkDueLabel(completionDate: string | Date): string {
  return format(freeTalkCompletionDateEnd(completionDate), 'MMM d, yyyy');
}

export function shouldShowFreeTalkDueIndicator(
  completionDate: string | null | undefined,
  completed: boolean
): completionDate is string {
  return isFreeTalkScenarioDueSoon(completionDate, completed);
}
