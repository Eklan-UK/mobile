import { isProSubscriber } from "@/utils/subscription";

/**
 * Returns the human-readable plan label for a user.
 * Uses the same rules as feature gating (`isProSubscriber`).
 */
export function getPlanLabel(user: {
  subscriptionPlan?: string | null;
  isSubscribed?: boolean;
}): string {
  return isProSubscriber(user) ? "Pro" : "Free";
}

/**
 * Returns a short motivational tagline for the current plan.
 */
export function getPlanTagline(planLabel: string): string {
  if (planLabel === "Pro" || planLabel === "Subscribed") {
    return "You're all set — dive in and make the most of every practice session.";
  }
  return "Upgrade to Pro to unlock all features and unlimited practice.";
}
