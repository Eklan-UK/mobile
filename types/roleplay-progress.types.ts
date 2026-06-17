export type RoleplayProgressSource = 'assignment' | 'weekly_challenge';

export type RoleplayRoleMode = 'original' | 'swapped';

export interface TurnProgressEntry {
  passed: boolean;
  score: number;
  attempts: number;
}

export type TurnProgressMap = Record<string, TurnProgressEntry>;

export interface TurnAnalytics {
  sceneIndex: number;
  turnIndex: number;
  text: string;
  score: number;
  textScore?: number;
  attempts: number;
  timestamp: string;
}

export interface RoleplayCheckpoint {
  currentSceneIndex: number;
  currentTurnIndex: number;
  pausedAtSceneBreak?: boolean;
  completedSceneIndex?: number;
  turnProgress?: TurnProgressMap;
  sessionAnalytics?: TurnAnalytics[];
  roleMode?: RoleplayRoleMode;
  originalRoleProgress?: TurnProgressMap;
  swappedRoleProgress?: TurnProgressMap;
  startedAt?: string;
}

export interface SaveRoleplayProgressBody {
  source: RoleplayProgressSource;
  assignmentId?: string;
  challengeId?: string;
  challengeItemIndex?: number;
  weekStartDate?: string;
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
