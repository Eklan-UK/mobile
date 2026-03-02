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
