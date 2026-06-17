import type {
  RoleplayCheckpoint,
  RoleplayProgressSource,
  RoleplayRoleMode,
  SaveRoleplayProgressBody,
  TurnAnalytics,
  TurnProgressMap,
} from '@/types/roleplay-progress.types';

export interface RoleplayRouteParams {
  id?: string;
  assignmentId?: string;
  source?: string;
  challengeId?: string;
  challengeItemIndex?: string;
  weekStartDate?: string;
}

export interface RoleplayProgressContext {
  source: RoleplayProgressSource;
  /** drillId used in /roleplay-progress URL path */
  progressDrillId: string;
  /** drill._id for detail fetch (assignment) or route id */
  detailDrillId: string;
  assignmentId?: string;
  challengeId?: string;
  challengeItemIndex?: number;
  weekStartDate?: string;
}

export interface RoleplayCheckpointState {
  currentSceneIndex: number;
  currentTurnIndex: number;
  pausedAtSceneBreak: boolean;
  completedSceneIndex?: number;
  turnProgress: TurnProgressMap;
  sessionAnalytics: TurnAnalytics[];
  roleMode: RoleplayRoleMode;
  originalRoleProgress: TurnProgressMap;
  swappedRoleProgress: TurnProgressMap;
  startedAt: string;
}

export function parseRoleplayProgressContext(params: RoleplayRouteParams): RoleplayProgressContext {
  const routeId = String(params.id ?? '').trim();
  const sourceParam = String(params.source ?? '').trim();

  if (sourceParam === 'weekly_challenge' || params.challengeId) {
    const challengeId = String(params.challengeId ?? routeId).trim();
    const itemIndex = Number(params.challengeItemIndex ?? 0);
    return {
      source: 'weekly_challenge',
      progressDrillId: challengeId,
      detailDrillId: routeId || challengeId,
      challengeId,
      challengeItemIndex: Number.isFinite(itemIndex) ? itemIndex : 0,
      weekStartDate: params.weekStartDate ? String(params.weekStartDate) : undefined,
    };
  }

  const assignmentId = params.assignmentId ? String(params.assignmentId).trim() : undefined;
  return {
    source: 'assignment',
    progressDrillId: routeId,
    detailDrillId: routeId,
    assignmentId,
  };
}

export function buildProgressQuery(ctx: RoleplayProgressContext): Record<string, string> {
  if (ctx.source === 'weekly_challenge') {
    return {
      source: 'weekly_challenge',
      challengeId: ctx.challengeId ?? ctx.progressDrillId,
      challengeItemIndex: String(ctx.challengeItemIndex ?? 0),
    };
  }
  return {
    source: 'assignment',
    assignmentId: ctx.assignmentId ?? '',
  };
}

export function buildProgressBody(
  ctx: RoleplayProgressContext,
  state: RoleplayCheckpointState
): SaveRoleplayProgressBody {
  const body: SaveRoleplayProgressBody = {
    source: ctx.source,
    currentSceneIndex: state.currentSceneIndex,
    currentTurnIndex: state.currentTurnIndex,
    pausedAtSceneBreak: state.pausedAtSceneBreak,
    completedSceneIndex: state.completedSceneIndex,
    turnProgress: state.turnProgress,
    sessionAnalytics: state.sessionAnalytics,
    roleMode: state.roleMode,
    originalRoleProgress: state.originalRoleProgress,
    swappedRoleProgress: state.swappedRoleProgress,
    startedAt: state.startedAt,
  };

  if (ctx.source === 'weekly_challenge') {
    body.challengeId = ctx.challengeId ?? ctx.progressDrillId;
    body.challengeItemIndex = ctx.challengeItemIndex ?? 0;
    if (ctx.weekStartDate) body.weekStartDate = ctx.weekStartDate;
  } else if (ctx.assignmentId) {
    body.assignmentId = ctx.assignmentId;
  }

  return body;
}

export function checkpointToState(checkpoint: RoleplayCheckpoint): RoleplayCheckpointState {
  return {
    currentSceneIndex: checkpoint.currentSceneIndex,
    currentTurnIndex: checkpoint.currentTurnIndex,
    pausedAtSceneBreak: Boolean(checkpoint.pausedAtSceneBreak),
    completedSceneIndex: checkpoint.completedSceneIndex,
    turnProgress: checkpoint.turnProgress ?? {},
    sessionAnalytics: checkpoint.sessionAnalytics ?? [],
    roleMode: checkpoint.roleMode ?? 'original',
    originalRoleProgress: checkpoint.originalRoleProgress ?? {},
    swappedRoleProgress: checkpoint.swappedRoleProgress ?? {},
    startedAt: checkpoint.startedAt ?? new Date().toISOString(),
  };
}
