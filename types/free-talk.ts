// ─── Scenario Types ────────────────────────────────────────────────────────

export const FREE_TALK_SCENARIO_TYPES = [
  'icu_emergency',
  'admission',
  'small_talk_patient',
  'handover',
  'decline_request',
  'phone_doctor',
  'small_talk_colleague',
] as const;

export type FreeTalkScenarioType = typeof FREE_TALK_SCENARIO_TYPES[number];

export const SCENARIO_TYPE_LABELS: Record<FreeTalkScenarioType, string> = {
  icu_emergency: 'ICU Emergency',
  admission: 'Admission',
  small_talk_patient: 'Small Talk — Patient',
  handover: 'Handover',
  decline_request: 'Decline Request',
  phone_doctor: 'Phone the Doctor',
  small_talk_colleague: 'Small Talk — Colleague',
};

export function formatScenarioType(type: string): string {
  return SCENARIO_TYPE_LABELS[type as FreeTalkScenarioType] ?? type;
}

// ─── Scenario models ────────────────────────────────────────────────────────

export interface FreeTalkScenarioSummary {
  id: string;
  title: string;
  scenarioType: string;
}

export interface FreeTalkScenario {
  id: string;
  title: string;
  situation: string;
  hint: string;
  usefulPhrases: string[];
  include: string[];
  scenarioType: string;
  background: string;
  task: string;
}

// ─── Grade / Attempt models ─────────────────────────────────────────────────

export interface FreeTalkAttemptGradeBehaviour {
  id: number;
  name: string;
  result: 'full' | 'partial' | 'none';
  score: number;
}

export interface FreeTalkAttemptGradeResult {
  overallScore: number;
  competencyLevel: string;
  behaviours: FreeTalkAttemptGradeBehaviour[];
  rawScore: number;
  maxScore: number;
}

export interface FreeTalkAttempt {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioType: string;
  feedbackText: string;
  gradeResult: FreeTalkAttemptGradeResult | null;
  audioUrl?: string | null;
  audioMimeType?: string;
  durationMs?: number | null;
  usedVoice: boolean;
  completedAt: string;
}

// ─── Local history schema (AsyncStorage) ────────────────────────────────────

export interface FreeTalkHistoryEntryV1 {
  v: 1;
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioType: string;
  completedAt: string;
  feedbackText: string;
  gradeResult: FreeTalkAttemptGradeResult | null;
  audioUrl?: string | null;
  durationMs?: number | null;
  usedVoice?: boolean;
}

// ─── Session phases ─────────────────────────────────────────────────────────

export type FreeTalkSessionPhase =
  | 'loading'
  | 'ready'
  | 'responding'
  | 'grading'
  | 'result';

// ─── SSE chunk types ─────────────────────────────────────────────────────────

export interface FreeTalkSSETextChunk {
  type: 'text';
  data: string;
}

export interface FreeTalkSSEMetadataChunk {
  type: 'metadata';
  data: {
    fullText: string;
    grade: FreeTalkAttemptGradeResult;
  };
}

export interface FreeTalkSSEErrorChunk {
  type: 'error';
  data: { message: string };
}

export type FreeTalkSSEChunk =
  | FreeTalkSSETextChunk
  | FreeTalkSSEMetadataChunk
  | FreeTalkSSEErrorChunk;

// ─── Competency level helper ─────────────────────────────────────────────────

export function getCompetencyLevel(score: number): string {
  if (score >= 90) return 'Advanced Clinical Communicator';
  if (score >= 80) return 'Safe & Effective Communicator';
  if (score >= 70) return 'Developing Communicator';
  if (score >= 60) return 'Need Improvement';
  return 'Unsafe Communication Risk';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
}

// ─── Normalise helpers ───────────────────────────────────────────────────────

export function normalizeFreeTalkScenarioStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as string[])
      .flatMap((s) => String(s).split(/\r\n|\n|\r/))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\r\n|\n|\r/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function freeTalkStringListToMultiline(lines: string[]): string {
  return lines.join('\n');
}
