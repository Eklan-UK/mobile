import { BADGE_UNLOCK_DEFINITIONS, isBadgeId } from '@/lib/badges/badge-definitions';
import type {
  BadgeId,
  BadgeUnlockCelebration,
  PartialBadgeUnlockCelebration,
} from '@/types/badge.types';

function getPayload(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null;

  const root = response as Record<string, unknown>;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    return root.data as Record<string, unknown>;
  }

  return root;
}

function toPartialCelebration(value: unknown): PartialBadgeUnlockCelebration | null {
  if (!value || typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const badgeId = item.badgeId;
  if (typeof badgeId !== 'string' || !badgeId) return null;

  return {
    badgeId,
    badgeName: typeof item.badgeName === 'string' ? item.badgeName : undefined,
    icon: typeof item.icon === 'string' ? item.icon : undefined,
    afterOutcome: typeof item.afterOutcome === 'string' ? item.afterOutcome : undefined,
    humorousLine: typeof item.humorousLine === 'string' ? item.humorousLine : undefined,
  };
}

export function resolveBadgeUnlockCelebration(
  partial: PartialBadgeUnlockCelebration
): BadgeUnlockCelebration {
  const badgeId = partial.badgeId;
  const fallback = isBadgeId(badgeId) ? BADGE_UNLOCK_DEFINITIONS[badgeId] : null;

  return {
    badgeId: (isBadgeId(badgeId) ? badgeId : 'first-steps') as BadgeId,
    badgeName: partial.badgeName ?? fallback?.badgeName ?? 'Badge Unlocked',
    icon: partial.icon ?? fallback?.icon ?? '🏅',
    afterOutcome: partial.afterOutcome ?? fallback?.afterOutcome ?? '',
    humorousLine: partial.humorousLine ?? fallback?.humorousLine ?? '',
  };
}

export function extractBadgesUnlocked(response: unknown): BadgeUnlockCelebration[] {
  if (!response || typeof response !== 'object') return [];

  const root = response as Record<string, unknown>;
  if (root.message === 'Already bookmarked') return [];

  const payload = getPayload(response);
  if (!payload) return [];

  const badgesUnlocked = payload.badgesUnlocked;
  if (Array.isArray(badgesUnlocked) && badgesUnlocked.length > 0) {
    return badgesUnlocked
      .map(toPartialCelebration)
      .filter((item): item is PartialBadgeUnlockCelebration => item !== null)
      .map(resolveBadgeUnlockCelebration);
  }

  const badgeUnlocked = toPartialCelebration(payload.badgeUnlocked);
  if (badgeUnlocked) {
    return [resolveBadgeUnlockCelebration(badgeUnlocked)];
  }

  return [];
}
