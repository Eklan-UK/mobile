import apiClient from '@/lib/api';
import { logger } from "@/utils/logger";

// ─── Full SpeechAce Response Types ───────────────────────────────

export interface PhoneScore {
  phone: string;
  stress_level: number | null;
  extent: [number, number];
  quality_score: number;
  stress_score?: number;
  predicted_stress_level?: number;
  word_extent: [number, number];
  sound_most_like: string;
}

export interface SyllableScore {
  phone_count: number;
  stress_level: number;
  letters: string;
  quality_score: number;
  stress_score: number;
  predicted_stress_level: number;
  extent: [number, number];
}

export interface WordScore {
  word: string;
  quality_score: number;
  phone_score_list: PhoneScore[];
  syllable_score_list: SyllableScore[];
}

export interface TextScore {
  text: string;
  word_score_list: WordScore[];
  ielts_score: { pronunciation: number };
  pte_score: { pronunciation: number };
  speechace_score: { pronunciation: number };
  toeic_score: { pronunciation: number };
  cefr_score: { pronunciation: string };
}

// ─── API Response Shape ──────────────────────────────────────────

export interface SpeechAceScoreResult {
  text_score?: number | TextScore;
  textScore?: TextScore;
  integrity_score?: number;
  fluency_score?: number;
  // Error fields
  status?: 'success' | 'error';
  short_message?: string;
  detail_message?: string;
  request_id?: string;
  version?: string;
  word_scores?: any[];
}

// ─── Helper to extract the full TextScore from a result ──────────

export function extractTextScore(result: SpeechAceScoreResult): TextScore | null {
  // Try camelCase version first (normalised by backend)
  if (result.textScore && typeof result.textScore === 'object' && result.textScore.word_score_list) {
    return result.textScore;
  }
  // Try snake_case object version
  if (result.text_score && typeof result.text_score === 'object') {
    return result.text_score as TextScore;
  }
  return null;
}

// ─── Helper to extract the overall pronunciation score number ────

export function extractQualityScore(result: SpeechAceScoreResult): number {
  if (typeof result.text_score === 'number') {
    return result.text_score;
  }
  if (result.textScore?.speechace_score?.pronunciation) {
    return result.textScore.speechace_score.pronunciation;
  }
  if (typeof result.text_score === 'object' && result.text_score?.speechace_score?.pronunciation) {
    return result.text_score.speechace_score.pronunciation;
  }
  if (typeof result.text_score === 'object' && result.text_score?.quality_score) {
    return result.text_score.quality_score;
  }
  return 0;
}

// ─── Service ─────────────────────────────────────────────────────

export const speechaceService = {
  /**
   * Score pronunciation using SpeechAce via backend proxy
   * @param text The text to evaluate
   * @param audioBase64 The base64 encoded audio string
   * @returns The scoring result
   */
  scorePronunciation: async (text: string, audioBase64: string): Promise<SpeechAceScoreResult> => {
    try {
      const response = await apiClient.post('/api/v1/speechace/score', {
        text,
        audioBase64,
        questionInfo: {
          questionId: 'vocabulary-drill',
        }
      });
      
      return response.data.data;
    } catch (error: any) {
      logger.error('SpeechAce Scoring Error:', error.message);
      throw error;
    }
  }
};
