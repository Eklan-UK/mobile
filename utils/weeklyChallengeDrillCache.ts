import type { Drill } from '@/types/drill.types';

/**
 * Module-level cache for adapted WC drills.
 *
 * The adapter screen (weekly-challenge/[weekStartDate]/[index].tsx) fetches the challenge
 * item, transforms it with toDrillShape, stores it here, then navigates to the
 * appropriate drill screen with WC meta params. The drill screen reads from this
 * cache when source=weekly_challenge is present (instead of calling getDrillById).
 *
 * The cache uses the synthetic drill ID ("{challengeId}-{index}") as the key.
 * Entries are replaced on each visit and never explicitly evicted — they're small
 * and the process lifecycle handles cleanup.
 */
const _cache = new Map<string, Drill>();

export function setCachedWCDrill(drillId: string, drill: Drill): void {
  _cache.set(drillId, drill);
}

export function getCachedWCDrill(drillId: string): Drill | undefined {
  return _cache.get(drillId);
}

export function clearCachedWCDrill(drillId: string): void {
  _cache.delete(drillId);
}
