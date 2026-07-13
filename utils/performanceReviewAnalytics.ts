import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import type { TextScore } from "@/services/speechace.service";
import type {
  PerformanceReviewAnalyticsRow,
  PerformanceReviewGroup,
  PerformanceReviewSnapshot,
} from "@/types/drill.types";
import type { TurnAnalytics } from "@/types/roleplay-progress.types";

export const SPEECH_DRILL_PASS_THRESHOLD = 65;

export function textScoreToRecord(
  textScore: TextScore | null
): Record<string, unknown> | null {
  if (!textScore) return null;
  return JSON.parse(JSON.stringify(textScore)) as Record<string, unknown>;
}

export function recordToTextScore(
  record: Record<string, unknown> | null | undefined
): TextScore | null {
  if (!record) return null;
  return record as unknown as TextScore;
}

export function turnIndexFromStep(step: "word" | "sentence"): number {
  return step === "word" ? 0 : 1;
}

export function stepFromTurnIndex(
  turnIndex: number
): "word" | "sentence" | undefined {
  if (turnIndex === 0) return "word";
  if (turnIndex === 1) return "sentence";
  return undefined;
}

export function upsertAnalyticsRow(
  rows: PerformanceReviewAnalyticsRow[],
  row: Omit<PerformanceReviewAnalyticsRow, "attempts"> & { attempts?: number }
): PerformanceReviewAnalyticsRow[] {
  const existing = rows.find(
    (r) => r.sceneIndex === row.sceneIndex && r.turnIndex === row.turnIndex
  );
  const attempts = row.attempts ?? (existing ? existing.attempts + 1 : 1);
  const next = rows.filter(
    (r) => !(r.sceneIndex === row.sceneIndex && r.turnIndex === row.turnIndex)
  );
  return [...next, { ...row, attempts }];
}

export function removeAnalyticsRow(
  rows: PerformanceReviewAnalyticsRow[],
  sceneIndex: number,
  turnIndex: number
): PerformanceReviewAnalyticsRow[] {
  return rows.filter(
    (r) => !(r.sceneIndex === sceneIndex && r.turnIndex === turnIndex)
  );
}

export function analyticsRowsToAnalysisResults(
  rows: PerformanceReviewAnalyticsRow[]
): AnalysisResult[] {
  return rows.map((row) => ({
    text: row.text,
    score: row.score,
    textScore: recordToTextScore(row.textScore),
    itemIndex: row.sceneIndex,
    step: stepFromTurnIndex(row.turnIndex),
  }));
}

export function turnAnalyticsToAnalyticsRows(
  analytics: TurnAnalytics[]
): PerformanceReviewAnalyticsRow[] {
  return analytics.map((row) => ({
    sceneIndex: row.sceneIndex,
    turnIndex: row.turnIndex,
    text: row.text,
    score: row.score,
    textScore: row.textScore,
    attempts: row.attempts,
  }));
}

export function turnAnalyticsToAnalysisResults(
  analytics: TurnAnalytics[]
): AnalysisResult[] {
  return analyticsRowsToAnalysisResults(turnAnalyticsToAnalyticsRows(analytics));
}

function truncatePreview(text: string, max = 40): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function buildAnalyticsGroups(
  analytics: PerformanceReviewAnalyticsRow[],
  titleForIndex: (index: number) => string
): PerformanceReviewGroup[] {
  const map = new Map<number, PerformanceReviewAnalyticsRow[]>();
  for (const row of analytics) {
    if (!map.has(row.sceneIndex)) map.set(row.sceneIndex, []);
    map.get(row.sceneIndex)!.push(row);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([sceneIndex, rows]) => ({
      sceneIndex,
      sceneTitle: titleForIndex(sceneIndex),
      rows: rows.sort((a, b) => a.turnIndex - b.turnIndex),
    }));
}

export interface SpeechDrillItemProgress {
  wordPassed: boolean;
  wordScore: number;
  sentencePassed: boolean;
  sentenceScore: number;
}

export function computeSpeechDrillAvgScore(
  analytics: PerformanceReviewAnalyticsRow[],
  itemProgress: SpeechDrillItemProgress[]
): number {
  if (analytics.length > 0) {
    return Math.round(
      analytics.reduce((sum, row) => sum + row.score, 0) / analytics.length
    );
  }

  const scored = itemProgress.filter(
    (item) => item.wordPassed && item.sentencePassed
  );
  if (scored.length === 0) return 0;

  const sum = scored.reduce(
    (acc, item) => acc + (item.wordScore + item.sentenceScore) / 2,
    0
  );
  return Math.round(sum / scored.length);
}

export function buildSpeechDrillPerformanceReviewSnapshot(params: {
  analytics: PerformanceReviewAnalyticsRow[];
  itemTitles: string[];
  itemProgress: SpeechDrillItemProgress[];
  passThreshold?: number;
  sectionHeading?: string;
}): PerformanceReviewSnapshot {
  const {
    analytics,
    itemTitles,
    itemProgress,
    passThreshold = SPEECH_DRILL_PASS_THRESHOLD,
    sectionHeading = "Item-by-Item Analysis",
  } = params;

  const groups = buildAnalyticsGroups(analytics, (index) => {
    const title = itemTitles[index] ?? `Item ${index + 1}`;
    return `Item ${index + 1}: ${truncatePreview(title)}`;
  });

  const passedItems = itemProgress.filter(
    (item) => item.wordPassed && item.sentencePassed
  ).length;
  const avgScore = computeSpeechDrillAvgScore(analytics, itemProgress);
  const statsLine = `${passedItems} of ${itemTitles.length} items passed · ${analytics.length} scored attempts`;

  return {
    version: 1,
    ui: "drillPerformance",
    avgScore,
    statsLine,
    passThreshold,
    sectionHeading,
    groups: JSON.parse(JSON.stringify(groups)) as PerformanceReviewGroup[],
  };
}

export function buildRoleplayPerformanceReviewSnapshot(params: {
  analytics: TurnAnalytics[];
  sceneNames: string[];
  completedStudentTurns: number;
  totalTurns: number;
  passThreshold?: number;
}): PerformanceReviewSnapshot {
  const {
    analytics,
    sceneNames,
    completedStudentTurns,
    totalTurns,
    passThreshold = SPEECH_DRILL_PASS_THRESHOLD,
  } = params;

  const rows = turnAnalyticsToAnalyticsRows(analytics);
  const groups = buildAnalyticsGroups(rows, (index) => {
    const name = sceneNames[index] ?? `Scene ${index + 1}`;
    return truncatePreview(name, 60);
  });

  const avgScore =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
      : 0;
  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const statsLine = `${completedStudentTurns} of ${totalTurns} lines completed · ${totalAttempts} scored attempts`;

  return {
    version: 1,
    ui: "roleplay",
    avgScore,
    statsLine,
    passThreshold,
    sectionHeading: "Scene-by-Scene Analysis",
    groups: JSON.parse(JSON.stringify(groups)) as PerformanceReviewGroup[],
  };
}
