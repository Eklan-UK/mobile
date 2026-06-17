import type { DrillAssignment } from '@/types/drill.types';

/**
 * Plan tabs — client-side:
 * - `ongoing`: not completed and not bookmarked
 * - `completed`: completed and not bookmarked
 * - `bookmarked`: hasBookmarks (any completion status)
 */

function readHasBookmarks(assignment: DrillAssignment): boolean {
  const r = assignment as Record<string, unknown>;
  return Boolean(assignment.hasBookmarks ?? r.has_bookmarks);
}

function assignmentIsCompleted(assignment: DrillAssignment): boolean {
  if (assignment.completedAt) return true;
  const raw = assignment.status;
  if (typeof raw !== 'string') return false;
  const normalized = raw.trim().toLowerCase().replace(/-/g, '_');
  return normalized === 'completed';
}

export type DrillPlanTab = 'ongoing' | 'completed' | 'bookmarked';

export function getDrillPlanTab(assignment: DrillAssignment): DrillPlanTab {
  if (readHasBookmarks(assignment)) {
    return 'bookmarked';
  }
  if (!assignmentIsCompleted(assignment)) {
    return 'ongoing';
  }
  return 'completed';
}

export function categorizeDrillsByPlanTab(drills: DrillAssignment[]) {
  const ongoing: DrillAssignment[] = [];
  const completed: DrillAssignment[] = [];
  const bookmarked: DrillAssignment[] = [];

  for (const d of drills) {
    const tab = getDrillPlanTab(d);
    if (tab === 'bookmarked') bookmarked.push(d);
    else if (tab === 'ongoing') ongoing.push(d);
    else completed.push(d);
  }

  return { ongoing, completed, bookmarked };
}
