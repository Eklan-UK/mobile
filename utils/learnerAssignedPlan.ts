import type { DrillAssignment } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import { resolveDrillPracticeType } from '@/utils/drillPracticeType';

function normalizeStatus(s: unknown): string {
  return typeof s === 'string' ? s.trim().toLowerCase().replace(/-/g, '_') : '';
}

export function isCompletedPlanItem(item: DrillAssignment): boolean {
  if (item.completedAt) return true;
  if (item.latestAttempt?.completedAt) return true;
  return normalizeStatus(item.status) === 'completed';
}

export function isActiveAssignedPlanItem(item: DrillAssignment): boolean {
  return !isCompletedPlanItem(item);
}

export function isInProgressPlanItem(item: DrillAssignment): boolean {
  return normalizeStatus(item.status) === 'in_progress';
}

export function assignedPlanSortTime(item: DrillAssignment): number {
  const raw = item.assignedAt ?? item.drill?.date ?? 0;
  const d = new Date(raw as string | Date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Sort ascending by assignment time (oldest first). */
export function sortAssignedPlanItems(items: DrillAssignment[]): DrillAssignment[] {
  return [...items].sort((a, b) => assignedPlanSortTime(a) - assignedPlanSortTime(b));
}

/** Picks next drill for the home Continue/Start Practice card. Excludes free-talk types. */
export function pickNextPracticeDrill(items: DrillAssignment[]): DrillAssignment | null {
  const active = items.filter((d) => {
    if (!isActiveAssignedPlanItem(d)) return false;
    const t = resolveDrillPracticeType(d.drill);
    return !isFreeTalkDrillType(t ?? undefined);
  });
  const sorted = sortAssignedPlanItems(active);
  return sorted.find(isInProgressPlanItem) ?? sorted[0] ?? null;
}
