import { extractBadgesUnlocked } from '@/lib/badges/badge-unlock';
import type { BadgeUnlockCelebration } from '@/types/badge.types';

type BadgeUnlockHandler = (items: BadgeUnlockCelebration[]) => void;

let badgeUnlockHandler: BadgeUnlockHandler | null = null;

export function registerBadgeUnlockHandler(handler: BadgeUnlockHandler | null): void {
  badgeUnlockHandler = handler;
}

export function celebrateBadges(items: BadgeUnlockCelebration[]): void {
  if (!items.length || !badgeUnlockHandler) return;
  badgeUnlockHandler(items);
}

export function celebrateBadgesFromResponse(response: unknown): void {
  const items = extractBadgesUnlocked(response);
  celebrateBadges(items);
}
