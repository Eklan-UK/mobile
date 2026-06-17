import type { DrillAssignment } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import { resolveDrillPracticeType } from '@/utils/drillPracticeType';

function normalizeStatus(s: unknown): string {
  return typeof s === 'string' ? s.trim().toLowerCase().replace(/-/g, '_') : '';
}

export function isActiveAssignedPlanItem(item: DrillAssignment): boolean {
  if (item.completedAt) return false;
  return normalizeStatus(item.status) !== 'completed';
}

export function isInProgressPlanItem(item: DrillAssignment): boolean {
  return normalizeStatus(item.status) === 'in_progress';
}

export function assignedPlanSortTime(item: DrillAssignment): string {
  return item.assignedAt ?? item.drill?.date ?? '';
}

export function sortAssignedPlanItems(items: DrillAssignment[]): DrillAssignment[] {
  return [...items].sort((a, b) =>
    assignedPlanSortTime(a).localeCompare(assignedPlanSortTime(b))
  );
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
