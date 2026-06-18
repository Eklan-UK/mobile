import type { Drill, DrillAssignment, DrillStatus } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import { resolveDrillPracticeType } from '@/utils/drillPracticeType';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function coerceJourneyPart(raw: unknown): 1 | 2 | 3 | 4 | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (n >= 1 && n <= 4) return n as 1 | 2 | 3 | 4;
  return undefined;
}

function readJourneyTopic(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Read learning journey fields from snake_case or camelCase API keys. */
export function readJourneyFields(source: Record<string, unknown> | null | undefined): {
  part?: 1 | 2 | 3 | 4;
  topic?: string;
} {
  if (!source) return {};
  const part = coerceJourneyPart(
    source.learning_journey_part ?? source.learningJourneyPart
  );
  const topic = readJourneyTopic(
    source.learning_journey_topic ?? source.learningJourneyTopic
  );
  return { part, topic };
}

/** Merge journey fields from assignment row and drill onto the normalized drill object. */
function applyJourneyFieldsToDrill(
  drill: Drill,
  ...sources: Array<Record<string, unknown> | null | undefined>
): Drill {
  for (const source of sources) {
    const { part, topic } = readJourneyFields(source);
    if (part != null) drill.learning_journey_part = part;
    if (topic != null) drill.learning_journey_topic = topic;
  }
  return drill;
}

function normalizeAssignmentStatus(raw: unknown): DrillStatus {
  if (typeof raw !== 'string') return 'pending';
  const normalized = raw.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'completed') return 'completed';
  return 'pending';
}

/**
 * my-drills may return nested `{ assignmentId, drill }` or flat LearnerDrill rows (MOBILE_MY_PLAN §8).
 */
export function normalizeDrillAssignment(entry: unknown): DrillAssignment | null {
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Record<string, unknown>;

  if (row.drill && typeof row.drill === 'object' && !Array.isArray(row.drill)) {
    const assignmentId = String(row.assignmentId ?? row.assignment_id ?? '').trim();
    if (!assignmentId) return null;
    const drill = applyJourneyFieldsToDrill(
      { ...(row.drill as Drill) },
      row,
      row.drill as Record<string, unknown>
    );
    return {
      assignmentId,
      drill,
      assignedBy: row.assignedBy as DrillAssignment['assignedBy'],
      assignedAt: (row.assignedAt ?? row.assigned_at ?? '') as string,
      dueDate: (row.dueDate ?? row.due_date) as string | undefined,
      status: normalizeAssignmentStatus(row.status),
      completedAt: (row.completedAt ?? row.completed_at) as string | undefined,
      latestAttempt: (row.latestAttempt ?? row.latest_attempt) as DrillAssignment['latestAttempt'],
      hasBookmarks: Boolean(row.hasBookmarks ?? row.has_bookmarks),
      itemType: row.itemType === 'free_talk_scenario' ? 'free_talk_scenario' : undefined,
    };
  }

  const assignmentId = String(row.assignmentId ?? row.assignment_id ?? '').trim();
  const drillId = String(row._id ?? row.drillId ?? row.drill_id ?? '').trim();
  if (!assignmentId || !drillId) return null;

  const {
    assignmentId: _a,
    assignment_id: _a2,
    status,
    dueDate,
    due_date,
    completedAt,
    completed_at,
    latestAttempt,
    latest_attempt,
    assignedAt,
    assigned_at,
    assignedBy,
    assigned_by,
    ...drillFields
  } = row;

  return {
    assignmentId,
    assignedBy: (assignedBy ?? assigned_by) as DrillAssignment['assignedBy'],
    assignedAt: (assignedAt ?? assigned_at ?? '') as string,
    dueDate: (dueDate ?? due_date) as string | undefined,
    status: normalizeAssignmentStatus(status),
    completedAt: (completedAt ?? completed_at) as string | undefined,
    latestAttempt: (latestAttempt ?? latest_attempt) as DrillAssignment['latestAttempt'],
    hasBookmarks: Boolean(row.hasBookmarks ?? row.has_bookmarks),
    itemType: row.itemType === 'free_talk_scenario' ? 'free_talk_scenario' : undefined,
    drill: applyJourneyFieldsToDrill(
      {
        ...(drillFields as Drill),
        _id: drillId,
        title: String(row.title ?? (drillFields as Drill).title ?? ''),
        type: (row.type ?? (drillFields as Drill).type) as Drill['type'],
      },
      row,
      drillFields as Record<string, unknown>
    ),
  };
}

export function normalizeDrillAssignments(entries: unknown[]): DrillAssignment[] {
  const out: DrillAssignment[] = [];
  for (const entry of entries) {
    const normalized = normalizeDrillAssignment(entry);
    if (normalized?.assignmentId && normalized.drill?._id) {
      out.push(normalized);
    }
  }
  return out;
}

/** Free-talk assignments are not backed by GET /drills/:id — skip prefetch and detail fetch. */
export function shouldFetchDrillDetail(
  drill: { type?: unknown; key_phrase_items?: unknown[] | null } | null | undefined
): boolean {
  const practiceType = resolveDrillPracticeType(drill);
  return !isFreeTalkDrillType(practiceType ?? undefined);
}

function readScenarioIdFromDrill(drill: Drill): string | undefined {
  const d = drill as Record<string, unknown>;
  for (const key of [
    'free_talk_scenario_id',
    'freeTalkScenarioId',
    'scenarioId',
    'scenario_id',
  ]) {
    const v = d[key];
    if (typeof v === 'string' && OBJECT_ID_RE.test(v.trim())) {
      return v.trim();
    }
  }
  const ctx = drill.context?.trim();
  if (ctx && OBJECT_ID_RE.test(ctx)) return ctx;
  return undefined;
}

/** Scenario id for eklan_free_talk navigation (not always equal to drill._id). */
export function resolveFreeTalkScenarioId(drill: Drill, assignmentId?: string): string {
  const explicit = readScenarioIdFromDrill(drill);
  if (explicit) return explicit;

  const drillId = drill._id?.trim() ?? '';
  const aid = assignmentId?.trim();
  if (drillId && aid && drillId === aid) {
    return drillId;
  }
  return drillId;
}

export function resolveDrillIdsFromListing(
  routeId: string,
  assignments: DrillAssignment[],
  paramAssignmentId?: string
): { drillId: string; assignmentId?: string } {
  if (paramAssignmentId) {
    return { drillId: routeId, assignmentId: paramAssignmentId };
  }
  const match = assignments.find(
    (d) => d.drill._id === routeId || d.assignmentId === routeId
  );
  if (!match) {
    return { drillId: routeId, assignmentId: undefined };
  }
  return { drillId: match.drill._id, assignmentId: match.assignmentId };
}
