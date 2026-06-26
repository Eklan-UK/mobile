import type { PerformanceReviewAnalyticsRow } from '@/types/drill.types';
import type { KeyPhraseItemResult } from '@/utils/keyPhrasesCompletion';

export enum DrillCheckpointType {
  vocabulary = 'vocabulary',
  pronunciation = 'pronunciation',
  matching = 'matching',
  definition = 'definition',
  grammar = 'grammar',
  sentence = 'sentence',
  sentence_writing = 'sentence_writing',
  fill_blank = 'fill_blank',
  key_phrases = 'key_phrases',
}

export interface VocabularyWordProgressEntry {
  wordPassed: boolean;
  wordScore: number;
  sentencePassed: boolean;
  sentenceScore: number;
}

/** Index-keyed progress map (`{ "0": { … } }`) for vocabulary / pronunciation. */
export type IndexKeyedWordProgress = Record<string, VocabularyWordProgressEntry>;

export interface SpeechDrillCheckpointPartialResults {
  wordProgress: IndexKeyedWordProgress;
  sessionReviewAnalytics: PerformanceReviewAnalyticsRow[];
}

export interface MatchingCheckpointPartialResults {
  matchedPairKeys: string[];
}

export interface AnswersCheckpointPartialResults {
  answers: Record<number, string>;
}

export interface GrammarCheckpointPartialResults {
  answers: Record<number, { sentence1: string; sentence2: string }>;
}

export interface SentenceCheckpointPartialResults {
  answers: {
    definition: string;
    sentence1: string;
    sentence2: string;
  };
}

export interface SentenceWritingCheckpointPartialResults {
  answers: {
    wordProgressList: Array<{
      word: string;
      hint?: string;
      audioUrl?: string;
      definition: string;
      sentence1: string;
      sentence2: string;
    }>;
    currentWordIndex: number;
    currentSection: 'intro' | 'definition' | 'sentences';
    showContext: boolean;
  };
}

export interface FillBlankCheckpointPartialResults {
  answers: Record<number, Record<number, string>>;
  submittedCount: number;
}

export interface KeyPhrasesCheckpointPartialResults {
  itemResults: Record<string, KeyPhraseItemResult>;
  sessionReviewAnalytics: PerformanceReviewAnalyticsRow[];
}

export type DrillCheckpointPartialResults =
  | SpeechDrillCheckpointPartialResults
  | MatchingCheckpointPartialResults
  | AnswersCheckpointPartialResults
  | GrammarCheckpointPartialResults
  | SentenceCheckpointPartialResults
  | SentenceWritingCheckpointPartialResults
  | FillBlankCheckpointPartialResults
  | KeyPhrasesCheckpointPartialResults;

export type PartialResultsForDrillType<T extends DrillCheckpointType> =
  T extends DrillCheckpointType.vocabulary | DrillCheckpointType.pronunciation
    ? SpeechDrillCheckpointPartialResults
    : T extends DrillCheckpointType.matching
      ? MatchingCheckpointPartialResults
      : T extends DrillCheckpointType.fill_blank
        ? FillBlankCheckpointPartialResults
        : T extends DrillCheckpointType.key_phrases
          ? KeyPhrasesCheckpointPartialResults
          : T extends DrillCheckpointType.grammar
            ? GrammarCheckpointPartialResults
            : T extends DrillCheckpointType.sentence
              ? SentenceCheckpointPartialResults
              : T extends DrillCheckpointType.sentence_writing
                ? SentenceWritingCheckpointPartialResults
                : AnswersCheckpointPartialResults;

export interface DrillCheckpoint<
  TPartial extends DrillCheckpointPartialResults = DrillCheckpointPartialResults,
> {
  _id?: string;
  drillId: string;
  drillAssignmentId: string;
  drillType: DrillCheckpointType;
  resumeFromIndex: number;
  completedItemCount: number;
  partialResults: TPartial;
  startedAt?: string;
  lastUpdatedAt?: string;
}

export interface SaveCheckpointBody<
  TPartial extends DrillCheckpointPartialResults = DrillCheckpointPartialResults,
> {
  assignmentId: string;
  drillType: DrillCheckpointType;
  resumeFromIndex: number;
  completedItemCount: number;
  partialResults: TPartial;
  startedAt?: string;
}
