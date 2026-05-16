// types/drill.types.ts

export type DrillType =
  | "vocabulary"
  | "roleplay"
  | "matching"
  | "definition"
  | "summary"
  | "grammar"
  | "sentence_writing"
  | "sentence"
  | "listening"
  | "fill_blank"
  | "pronunciation";

export type DrillDifficulty = "beginner" | "intermediate" | "advanced";

export interface DialogueTurn {
  speaker: "student" | "ai_0" | "ai_1" | "ai_2" | "ai_3";
  text: string;
  translation?: string;
  audioUrl?: string;
}

export interface RoleplayScene {
  scene_name: string;
  context?: string;
  dialogue: DialogueTurn[];
}

export interface TargetSentence {
  word?: string;
  wordTranslation?: string;
  text: string;
  translation?: string;
  wordAudioUrl?: string;
  sentenceAudioUrl?: string;
}

export interface MatchingPair {
  left: string;
  right: string;
  leftTranslation?: string;
  rightTranslation?: string;
  leftAudioUrl?: string;
  rightAudioUrl?: string;
}

export interface DefinitionItem {
  word: string;
  hint?: string;
}

export interface GrammarItem {
  pattern: string;
  hint?: string;
  example: string;
}

export interface SentenceWritingItem {
  word: string;
  hint?: string;
  audioUrl?: string;
}

export interface PronunciationItem {
  sound: string;
  word: string;
  sentence: string;
  soundAudioUrl?: string;
  wordAudioUrl?: string;
  sentenceAudioUrl?: string;
}

export interface FillBlankItem {
  sentence: string;
  blanks: Array<{
    position: number;
    correctAnswer: string;
    options: string[];
    hint?: string;
  }>;
  translation?: string;
  audioUrl?: string;
}

export interface Drill {
  _id: string;
  title: string;
  type: DrillType;
  difficulty: DrillDifficulty;
  date: string;
  duration_days: number;
  assigned_to: string[];
  context?: string;
  audio_example_url?: string;

  // Vocabulary fields
  target_sentences?: TargetSentence[];

  // Roleplay fields
  roleplay_dialogue?: DialogueTurn[];
  roleplay_scenes?: RoleplayScene[];
  student_character_name?: string;
  ai_character_name?: string;
  ai_character_names?: string[];

  // Matching fields
  matching_pairs?: MatchingPair[];

  // Definition fields
  definition_items?: DefinitionItem[];

  // Grammar fields
  grammar_items?: GrammarItem[];

  // Sentence writing fields
  sentence_writing_items?: SentenceWritingItem[];

  // Sentence drill fields
  sentence_drill_word?: string;
  sentence_drill_audio_url?: string;

  // Listening fields
  listening_drill_title?: string;
  listening_drill_content?: string;
  listening_drill_audio_url?: string;

  // Summary fields
  article_title?: string;
  article_content?: string;
  article_audio_url?: string;

  // Fill blank fields
  fill_blank_items?: FillBlankItem[];

  // Pronunciation fields
  pronunciation_items?: PronunciationItem[];

  // Metadata
  created_by: string;
  createdById?: string;
  created_date: string;
  updated_date: string;
  is_active: boolean;

  // Analytics
  totalAssignments?: number;
  totalCompletions?: number;
  averageScore?: number;
  averageCompletionTime?: number;
}

// Helper to get drill category display name
export const getDrillCategory = (type: DrillType): string => {
  const categories: Record<DrillType, string> = {
    vocabulary: "Vocabulary",
    roleplay: "Scenario",
    matching: "Matching",
    definition: "Definition",
    summary: "Reading",
    grammar: "Grammar",
    sentence_writing: "Writing",
    sentence: "Sentence",
    listening: "Listening",
    fill_blank: "Fill in the Blank",
    pronunciation: "Pronunciation",
  };
  // Type guard: ensure the type exists in categories
  if (type in categories) {
    return categories[type];
  }
  // Fallback for unknown types (should never happen with proper typing)
  console.warn(`Unknown drill type: ${type}`);
  return "Drill";
};

// Helper to format duration
export const formatDuration = (durationDays: number): string => {
  if (durationDays === 1) return "1 day";
  return `${durationDays} days`;
};

// Helper to get estimated time
export const getEstimatedTime = (type: DrillType): string => {
  const times: Record<DrillType, string> = {
    vocabulary: "5-15 mins",
    roleplay: "5-15 mins",
    matching: "5-15 mins",
    definition: "5-15 mins",
    summary: "5-15 mins",
    grammar: "5-15 mins",
    sentence_writing: "5-15 mins",
    sentence: "5-15 mins",
    listening: "5-15 mins",
    fill_blank: "5-15 mins",
    pronunciation: "5-15 mins",
  };
  return times[type];
};

// Drill Assignment Types (from backend API)
export interface DrillAttempt {
  _id: string;
  score?: number;
  completedAt?: string;
  timeSpent?: number;
  answers?: any[];
  /** Tutor review state on the attempt (GET /users/current my-drills — see docs/MOBILE_MY_PLAN.md). */
  reviewStatus?: 'pending' | 'reviewed';

  // Results with review status
  grammarResults?: { reviewStatus?: 'pending' | 'reviewed' };
  sentenceResults?: { reviewStatus?: 'pending' | 'reviewed' };
  summaryResults?: { reviewStatus?: 'pending' | 'reviewed' };
  sentenceWritingResults?: { reviewStatus?: 'pending' | 'reviewed' };
  definitionResults?: { reviewStatus?: 'pending' | 'reviewed' };
  listeningResults?: { reviewStatus?: 'pending' | 'reviewed' };
  fillBlankResults?: { reviewStatus?: 'pending' | 'reviewed' };
  roleplayResults?: { 
    sceneScores?: Array<{
      sceneName: string;
      score: number;
    }>;
  };
  pronunciationResults?: { reviewStatus?: 'pending' | 'reviewed' };
}

export interface DrillAssignment {
  assignmentId: string;
  drill: Drill;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  latestAttempt?: DrillAttempt;
}

export interface DrillsResponse {
  drills: DrillAssignment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export type DrillStatus = 'pending' | 'in_progress' | 'completed';
