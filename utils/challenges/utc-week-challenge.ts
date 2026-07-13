/**
 * Whether today (UTC) is a weekly challenge day for this learner.
 * Without subscription activation: Sunday UTC. With activation: every 7th day (day 6, 13, …).
 */
export function isWeeklyChallengeDayUtc(
  now: Date = new Date(),
  subscriptionActivatedAt?: Date,
): boolean {
  if (!subscriptionActivatedAt) {
    return now.getUTCDay() === 0;
  }
  const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const activatedMs = Date.UTC(
    subscriptionActivatedAt.getUTCFullYear(),
    subscriptionActivatedAt.getUTCMonth(),
    subscriptionActivatedAt.getUTCDate(),
  );
  const daysDiff = Math.round((nowMs - activatedMs) / 86_400_000);
  return daysDiff >= 0 && daysDiff % 7 === 6;
}
