import type { BillingPeriod } from '@/types/billing';

/** Fields that may appear on auth or `/users/current` payloads (camelCase or snake_case). */
export type ProSubscriptionFields = {
  isSubscribed?: boolean;
  subscriptionPlan?: string | null;
  is_subscribed?: boolean;
  subscription_plan?: string | null;
  eligibleForTrial?: boolean;
  subscriptionBillingPeriod?: BillingPeriod | null;
};

/**
 * Pro / paid UX and feature gating.
 * Strict contract gate: Pro is `isSubscribed === true` / `is_subscribed === true` only.
 * `subscriptionPlan` / `subscription_plan` are display/diagnostics only and never gate access.
 */
export function isProSubscriber(user: ProSubscriptionFields | null | undefined): boolean {
  if (!user) return false;

  return (user.isSubscribed ?? user.is_subscribed) === true;
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
    eligibleForTrial: server.eligibleForTrial ?? base.eligibleForTrial,
    subscriptionBillingPeriod:
      server.subscriptionBillingPeriod ?? base.subscriptionBillingPeriod,
  };

  return {
    ...merged,
    isSubscribed: isProSubscriber(merged),
  };
}
