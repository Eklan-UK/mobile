import type { TextScore } from "@/services/speechace.service";
import type {
  KeyPhraseItem,
  KeyPhrasesResult,
  PerformanceReviewAnalyticsRow,
  PerformanceReviewGroup,
  PerformanceReviewSnapshot,
} from "@/types/drill.types";

export const KEY_PHRASES_PASS_THRESHOLD = 65;

export type KeyPhraseItemResult = {
  prompt: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pronunciationScore: number;
  textScore?: Record<string, unknown> | null;
  attempts: number;
};

export function computeKeyPhrasesAvgScore(results: KeyPhraseItemResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + (r.pronunciationScore ?? 0), 0);
  return Math.round(sum / results.length);
}

export function buildKeyPhrasesResults(
  items: KeyPhraseItem[],
  itemResults: KeyPhraseItemResult[]
): KeyPhrasesResult {
  const merged: KeyPhrasesResult["items"] = items.map((item, index) => {
    const r = itemResults[index];
    if (r) {
      return {
        prompt: r.prompt,
        selectedAnswer: r.selectedAnswer,
        correctAnswer: r.correctAnswer,
        isCorrect: r.isCorrect,
        pronunciationScore: r.pronunciationScore,
        textScore: r.textScore ?? undefined,
        attempts: r.attempts,
      };
    }
    return {
      prompt: item.prompt,
      selectedAnswer: "",
      correctAnswer: item.correctAnswer,
      isCorrect: false,
      pronunciationScore: 0,
      attempts: 0,
    };
  });

  const correctItems = merged.filter((m) => m.isCorrect).length;
  const score = computeKeyPhrasesAvgScore(
    merged.map((m) => ({
      prompt: m.prompt,
      selectedAnswer: m.selectedAnswer,
      correctAnswer: m.correctAnswer,
      isCorrect: m.isCorrect,
      pronunciationScore: m.pronunciationScore ?? 0,
      attempts: m.attempts,
    }))
  );

  return {
    items: merged,
    totalItems: items.length,
    correctItems,
    score,
  };
}

function truncatePreview(text: string, max = 40): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function buildPerformanceReviewGroups(
  analytics: PerformanceReviewAnalyticsRow[],
  items: KeyPhraseItem[]
): PerformanceReviewGroup[] {
  const map = new Map<number, PerformanceReviewAnalyticsRow[]>();
  for (const row of analytics) {
    if (!map.has(row.sceneIndex)) map.set(row.sceneIndex, []);
    map.get(row.sceneIndex)!.push(row);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([sceneIndex, rows]) => {
      const prompt = items[sceneIndex]?.prompt ?? "";
      return {
        sceneIndex,
        sceneTitle: `Question ${sceneIndex + 1}: ${truncatePreview(prompt)}`,
        rows: rows.sort((a, b) => a.turnIndex - b.turnIndex),
      };
    });
}

export function buildPerformanceReviewSnapshot(params: {
  analytics: PerformanceReviewAnalyticsRow[];
  items: KeyPhraseItem[];
  itemResults: KeyPhraseItemResult[];
  passThreshold?: number;
}): PerformanceReviewSnapshot {
  const { analytics, items, itemResults, passThreshold = KEY_PHRASES_PASS_THRESHOLD } = params;
  const groups = buildPerformanceReviewGroups(analytics, items);

  const avgScore =
    analytics.length > 0
      ? Math.round(analytics.reduce((s, r) => s + r.score, 0) / analytics.length)
      : computeKeyPhrasesAvgScore(itemResults);

  const correctItems = itemResults.filter((r) => r.isCorrect).length;
  const statsLine = `${correctItems} of ${items.length} correct · ${analytics.length} scored attempts`;

  return {
    version: 1,
    ui: "drillPerformance",
    avgScore,
    statsLine,
    passThreshold,
    sectionHeading: "Question-by-Question Analysis",
    groups: JSON.parse(JSON.stringify(groups)) as PerformanceReviewGroup[],
  };
}

export function textScoreToRecord(textScore: TextScore | null): Record<string, unknown> | undefined {
  if (!textScore) return undefined;
  return JSON.parse(JSON.stringify(textScore)) as Record<string, unknown>;
}
