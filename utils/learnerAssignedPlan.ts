import type { DrillAssignment } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import { resolveDrillPracticeType } from '@/utils/drillPracticeType';

function normalizeStatus(s: unknown): string {
  return typeof s === 'string' ? s.trim().toLowerCase().replace(/-/g, '_') : '';
}

export function isCompletedPlanItem(item: DrillAssignment): boolean {
  if (item.completedAt) return true;
  return normalizeStatus(item.status) === 'completed';
}

export function isActiveAssignedPlanItem(item: DrillAssignment): boolean {
  return !isCompletedPlanItem(item);
}

export function isInProgressPlanItem(item: DrillAssignment): boolean {
  return normalizeStatus(item.status) === 'in_progress';
}

export function assignedPlanSortTime(item: DrillAssignment): string {
  return item.assignedAt ?? item.drill?.date ?? '';
}

function dueDateMs(item: DrillAssignment): number {
  const raw = item.dueDate ?? item.drill?.date;
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

/** Active/incomplete first, then due date ascending, completed last. */
export function sortAssignedPlanItems(items: DrillAssignment[]): DrillAssignment[] {
  return [...items].sort((a, b) => {
    const aDone = isCompletedPlanItem(a);
    const bDone = isCompletedPlanItem(b);
    if (aDone !== bDone) return aDone ? 1 : -1;
    const dueCmp = dueDateMs(a) - dueDateMs(b);
    if (dueCmp !== 0) return dueCmp;
    return assignedPlanSortTime(a).localeCompare(assignedPlanSortTime(b));
  });
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
