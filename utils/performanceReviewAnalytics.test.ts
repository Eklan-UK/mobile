import { describe, expect, it } from "vitest";
import {
  analyticsRowsToAnalysisResults,
  buildSpeechDrillPerformanceReviewSnapshot,
  removeAnalyticsRow,
  turnAnalyticsToAnalysisResults,
  upsertAnalyticsRow,
} from "./performanceReviewAnalytics";

describe("upsertAnalyticsRow", () => {
  it("inserts a new row with attempts 1", () => {
    const result = upsertAnalyticsRow([], {
      sceneIndex: 0,
      turnIndex: 0,
      text: "hello",
      score: 80,
      textScore: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.attempts).toBe(1);
  });

  it("replaces an existing row and increments attempts", () => {
    const initial = upsertAnalyticsRow([], {
      sceneIndex: 0,
      turnIndex: 0,
      text: "hello",
      score: 70,
      textScore: null,
    });
    const updated = upsertAnalyticsRow(initial, {
      sceneIndex: 0,
      turnIndex: 0,
      text: "hello",
      score: 85,
      textScore: null,
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]?.score).toBe(85);
    expect(updated[0]?.attempts).toBe(2);
  });
});

describe("analyticsRowsToAnalysisResults", () => {
  it("maps scene and turn indices to item index and step", () => {
    const rows = analyticsRowsToAnalysisResults([
      {
        sceneIndex: 2,
        turnIndex: 1,
        text: "sentence",
        score: 90,
        textScore: null,
        attempts: 1,
      },
    ]);
    expect(rows[0]?.itemIndex).toBe(2);
    expect(rows[0]?.step).toBe("sentence");
  });
});

describe("removeAnalyticsRow", () => {
  it("removes only the matching scene and turn", () => {
    const rows = [
      {
        sceneIndex: 0,
        turnIndex: 0,
        text: "a",
        score: 1,
        textScore: null,
        attempts: 1,
      },
      {
        sceneIndex: 0,
        turnIndex: 1,
        text: "b",
        score: 2,
        textScore: null,
        attempts: 1,
      },
    ];
    const result = removeAnalyticsRow(rows, 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0]?.turnIndex).toBe(1);
  });
});

describe("buildSpeechDrillPerformanceReviewSnapshot", () => {
  it("builds groups for all checkpointed analytics rows", () => {
    const snapshot = buildSpeechDrillPerformanceReviewSnapshot({
      analytics: [
        {
          sceneIndex: 0,
          turnIndex: 0,
          text: "cat",
          score: 80,
          textScore: null,
          attempts: 1,
        },
        {
          sceneIndex: 0,
          turnIndex: 1,
          text: "The cat sat.",
          score: 75,
          textScore: null,
          attempts: 1,
        },
        {
          sceneIndex: 4,
          turnIndex: 0,
          text: "dog",
          score: 70,
          textScore: null,
          attempts: 2,
        },
      ],
      itemTitles: ["cat", "bat", "rat", "mat", "dog"],
      itemProgress: [
        { wordPassed: true, wordScore: 80, sentencePassed: true, sentenceScore: 75 },
        { wordPassed: false, wordScore: 0, sentencePassed: false, sentenceScore: 0 },
        { wordPassed: false, wordScore: 0, sentencePassed: false, sentenceScore: 0 },
        { wordPassed: false, wordScore: 0, sentencePassed: false, sentenceScore: 0 },
        { wordPassed: true, wordScore: 70, sentencePassed: false, sentenceScore: 0 },
      ],
    });

    expect(snapshot.groups).toHaveLength(2);
    expect(snapshot.groups[0]?.rows).toHaveLength(2);
    expect(snapshot.statsLine).toContain("1 of 5 items passed");
    expect(snapshot.statsLine).toContain("3 scored attempts");
  });
});

describe("turnAnalyticsToAnalysisResults", () => {
  it("converts roleplay session analytics for review UI", () => {
    const results = turnAnalyticsToAnalysisResults([
      {
        sceneIndex: 1,
        turnIndex: 0,
        text: "Hello there",
        score: 88,
        textScore: { word_score_list: [] },
        attempts: 1,
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(results[0]?.itemIndex).toBe(1);
    expect(results[0]?.text).toBe("Hello there");
  });
});
