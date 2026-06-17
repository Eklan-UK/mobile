// Weekly Challenge domain types
// Source: mobile-weekly-challenge.md §5

export interface WeeklyChallengeListItem {
  index: number;
  itemId: string; // "{challengeId}-{index}"
  drillType: string;
  label: string;
  instructions: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface WeeklyChallengeListResponse {
  challengeId: string | null;
  weekStartDate: string; // ISO datetime
  generatedAt?: string | null;
  weekNumber?: number;
  status: 'ready' | 'generating' | 'failed' | 'unavailable';
  summaryMessage: string;
  totalEstimatedMinutes: number;
  drillSequence: WeeklyChallengeListItem[];
  isSunday: boolean;
}

export interface WeeklyChallengeHistoryResponse {
  challenges: WeeklyChallengeListResponse[];
}

// ─── Drill item types ─────────────────────────────────────────────────────────

export interface WeaknessSignal {
  drillType: string;
  category: 'pronunciation' | 'fluency' | 'vocabulary' | 'grammar';
  severity: number; // 0–1
  evidence: string[];
  label: string;
}

export interface PronunciationGeneratedContent {
  pronunciation_items: Array<{
    word: string;
    sentence: string;
    sound?: string; // IPA string
    wordAudioUrl?: string;
    sentenceAudioUrl?: string;
  }>;
}

export interface FillBlankGeneratedContent {
  fill_blank_items: Array<{
    sentence: string; // contains ___ per blank
    blanks: Array<{
      position: number;
      correctAnswer: string;
      options: string[];
      hint?: string;
    }>;
    translation?: string;
    audioUrl?: string;
  }>;
}

export interface KeyPhrasesGeneratedContent {
  key_phrase_items: Array<{
    prompt: string;
    options: string[];
    correctAnswer: string; // must exactly match one entry in options[]
    respondentName?: string;
    promptAudioUrl?: string;
  }>;
}

export interface RoleplayGeneratedContent {
  student_character_name: string;
  ai_character_names: string[];
  context?: string;
  drill_intro?: string;
  roleplay_scenes: Array<{
    scene_name?: string;
    context?: string;
    dialogue: Array<{
      speaker: string; // "student" | "ai_0" | "ai_1" … NEVER a display name
      text: string;
      translation?: string;
      audioUrl?: string;
    }>;
  }>;
}

export interface ChallengeDrillItem {
  drillType: 'pronunciation' | 'vocabulary' | 'fill_blank' | 'key_phrases' | 'roleplay';
  targetWeakness: WeaknessSignal;
  instructions: string;
  generatedContent:
    | PronunciationGeneratedContent
    | FillBlankGeneratedContent
    | KeyPhrasesGeneratedContent
    | RoleplayGeneratedContent;
  estimatedMinutes: number;
}

export interface WeeklyChallengeItemResponse {
  challengeId: string;
  itemId: string; // "{challengeId}-{index}"
  weekStartDate: string;
  index: number;
  item: ChallengeDrillItem;
  completed: boolean;
}

export interface WeeklyChallengeCompleteResponse {
  challengeId: string;
  itemId: string;
  index: number;
  completed: boolean;
  completedItemIndexes: number[];
  totalItems: number;
}

// ─── Weekly challenge meta (passed into drill runner) ─────────────────────────

export interface WeeklyChallengeMeta {
  challengeId: string;
  itemIndex: number;
  itemId: string;
  weekStartDate: string;
}
