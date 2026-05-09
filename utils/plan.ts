/**
 * Returns the human-readable plan label for a user.
 * Mirrors the web app's STUDENT_PLAN_LABEL_OVERRIDE logic (MOBILE_PROFILE.md §6).
 */
export function getPlanLabel(user: {
  subscriptionPlan?: string | null;
  isSubscribed?: boolean;
}): string {
  if (user.subscriptionPlan) return 'Pro';
  if (user.isSubscribed) return 'Subscribed';
  return 'Free';
}

/**
 * Returns a short motivational tagline for the current plan.
 */
export function getPlanTagline(planLabel: string): string {
  if (planLabel === 'Pro' || planLabel === 'Subscribed') {
    return "You're all set — dive in and make the most of every practice session.";
  }
  return 'Upgrade to Pro to unlock all features and unlimited practice.';
}
