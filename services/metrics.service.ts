import apiClient from '@/lib/api';

// ── Pronunciation ─────────────────────────────────────────────

export interface PronunciationMetrics {
  learnerId: string;
  overallScore: number;
  totalWordsPronounced: number;
  history: Array<{
    score: number;
    computedAt: string;
    wordsCount: number;
  }>;
  lastComputedAt: string;
}

export async function getPronunciationMetrics(): Promise<PronunciationMetrics> {
  const response = await apiClient.get('/api/v1/pronunciation');
  return response.data?.data?.pronunciation;
}

// ── Confidence ────────────────────────────────────────────────

export interface ConfidenceMetrics {
  learnerId: string;
  drillsAssigned: number;
  drillsCompleted: number;
  completionRate: number;
  qualityScore: number;
  confidenceScore: number;
  label:
    | 'Excellent'
    | 'Very Good'
    | 'Good'
    | 'Average'
    | 'Developing'
    | 'Needs Improvement';
  trend: 'improving' | 'stable' | 'declining';
  history: Array<{
    score: number;
    label: string;
    computedAt: string;
    drillsCompleted: number;
  }>;
  lastComputedAt: string;
}

export async function getConfidenceMetrics(): Promise<ConfidenceMetrics> {
  const response = await apiClient.get('/api/v1/confidence');
  return response.data?.data?.confidence;
}

// ── Home Progress ─────────────────────────────────────────────

export interface HomeProgressMetrics {
  accurateSentenceUsage: number;  // 0–100
  responseSpeed: number;          // 0–100
  sentenceWeeklyChange: number;   // delta vs last week
  speedWeeklyChange: number;
}

const EMPTY_HOME_PROGRESS: HomeProgressMetrics = {
  accurateSentenceUsage: 0,
  responseSpeed: 0,
  sentenceWeeklyChange: 0,
  speedWeeklyChange: 0,
};

export async function getHomeProgressMetrics(): Promise<HomeProgressMetrics> {
  try {
    const response = await apiClient.get('/api/v1/progress/home');
    return response.data?.data?.homeProgress ?? EMPTY_HOME_PROGRESS;
  } catch {
    // Backend 500 — keep home usable; metrics show as 0 until API recovers
    return EMPTY_HOME_PROGRESS;
  }
}

// ── Streak ─────────────────────────────────────────────────────

/** React Query key — shared by `useStreak` (profile / streak screen) and `useUserStreakCount` (home / My Plan pill). */
export const userStreakQueryKey = ['user-streak'] as const;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  weeklyActivity?: boolean[]; // 7 booleans, index 0 = Monday
}

export async function fetchUserStreak(): Promise<StreakData> {
  const response = await apiClient.get('/api/v1/users/streak');
  return response.data?.data ?? response.data;
}
