/** Fields that may appear on auth or `/users/current` payloads (camelCase or snake_case). */
export type ProSubscriptionFields = {
  isSubscribed?: boolean;
  subscriptionPlan?: string | null;
  is_subscribed?: boolean;
  subscription_plan?: string | null;
};

/**
 * Pro / paid UX and feature gating.
 * Prefer explicit `isSubscribed` from the API when present.
 * If it is missing (common on sign-in payloads), fall back to `subscriptionPlan === "premium"`.
 * If the API explicitly sends `isSubscribed: false`, that wins over plan (server downgrade / edge cases).
 */
export function isProSubscriber(user: ProSubscriptionFields | null | undefined): boolean {
  if (!user) return false;

  const explicit = user.isSubscribed ?? user.is_subscribed;
  const plan = user.subscriptionPlan ?? user.subscription_plan ?? null;

  if (explicit === true) return true;
  if (explicit === false) return false;
  return plan === "premium";
}
