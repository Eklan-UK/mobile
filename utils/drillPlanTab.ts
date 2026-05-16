import type { DrillAssignment, DrillAttempt } from '@/types/drill.types';

/**
 * Plan tabs — **docs/MOBILE_MY_PLAN.md §7** (client-side):
 * - `ongoing`: assignment not completed
 * - `reviewed`: completed **and** `latestAttempt.reviewStatus === 'reviewed'` (tutor has reviewed)
 * - `completed`: completed but not in the reviewed bucket
 *
 * Listing may use `latest_attempt` (snake_case); we normalize when reading the attempt.
 */

/** my-drills may expose `latest_attempt` (snake) without camelCase normalization. */
function resolveLatestAttempt(assignment: DrillAssignment): DrillAttempt | undefined {
  const r = assignment as Record<string, unknown>;
  const la = assignment.latestAttempt ?? r.latest_attempt;
  if (!la || typeof la !== 'object' || Array.isArray(la)) return undefined;
  return la as DrillAttempt;
}

/** Root `latestAttempt` / `latest_attempt` only — matches handoff `LearnerDrill.latestAttempt`. */
function readAttemptRootReviewStatus(assignment: DrillAssignment): string | undefined {
  const att = resolveLatestAttempt(assignment);
  if (!att || typeof att !== 'object' || Array.isArray(att)) return undefined;
  const o = att as Record<string, unknown>;
  const rs = o.reviewStatus ?? o.review_status;
  return typeof rs === 'string' ? rs.trim() : undefined;
}

function assignmentIsCompleted(assignment: DrillAssignment): boolean {
  if (assignment.completedAt) return true;
  const raw = assignment.status;
  if (typeof raw !== 'string') return false;
  const normalized = raw.trim().toLowerCase().replace(/-/g, '_');
  return normalized === 'completed';
}

function rootReviewStatusIsReviewed(assignment: DrillAssignment): boolean {
  const s = readAttemptRootReviewStatus(assignment)?.toLowerCase();
  return s === 'reviewed';
}

/**
 * @see docs/MOBILE_MY_PLAN.md §7
 */
export function getDrillPlanTab(assignment: DrillAssignment): 'ongoing' | 'reviewed' | 'completed' {
  if (!assignmentIsCompleted(assignment)) {
    return 'ongoing';
  }
  if (rootReviewStatusIsReviewed(assignment)) {
    return 'reviewed';
  }
  return 'completed';
}

export function categorizeDrillsByPlanTab(drills: DrillAssignment[]) {
  const ongoing: DrillAssignment[] = [];
  const reviewed: DrillAssignment[] = [];
  const completed: DrillAssignment[] = [];

  for (const d of drills) {
    const tab = getDrillPlanTab(d);
    if (tab === 'ongoing') ongoing.push(d);
    else if (tab === 'reviewed') reviewed.push(d);
    else completed.push(d);
  }

  return { ongoing, reviewed, completed };
}
