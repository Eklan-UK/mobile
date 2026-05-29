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

type UserWithId = ProSubscriptionFields & { id?: string };

/** Pro status from auth store + `/users/current` when the cache belongs to the same user. */
export function userHasProAccess(
  authUser: UserWithId | null | undefined,
  cachedUser: UserWithId | null | undefined
): boolean {
  const authId = authUser?.id;
  const cachedId = cachedUser?.id;
  const cacheIsForCurrentUser =
    Boolean(cachedUser) && (!authId || !cachedId || authId === cachedId);

  if (cacheIsForCurrentUser) {
    return isProSubscriber(cachedUser);
  }
  return isProSubscriber(authUser);
}

/** Merge server subscription fields onto a local user and recompute `isSubscribed`. */
export function mergeSubscriptionFields<T extends ProSubscriptionFields>(
  base: T,
  server?: ProSubscriptionFields | null
): T {
  if (!server) return base;

  const merged = {
    ...base,
    subscriptionPlan:
      server.subscriptionPlan ??
      server.subscription_plan ??
      base.subscriptionPlan ??
      base.subscription_plan,
    subscriptionExpiresAt:
      (server as { subscriptionExpiresAt?: string | null }).subscriptionExpiresAt ??
      (base as { subscriptionExpiresAt?: string | null }).subscriptionExpiresAt,
    isSubscribed: server.isSubscribed ?? server.is_subscribed ?? base.isSubscribed,
  };

  return {
    ...merged,
    isSubscribed: isProSubscriber(merged),
  };
}
