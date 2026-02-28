import apiClient from '@/lib/api';
import { logger } from "@/utils/logger";

export interface SpeechAceScoreResult {
  text_score?: number | {
    text: string;
    quality_score: number;
    word_score_list: Array<{
      word: string;
      quality_score: number;
      phone_score_list: Array<{
        phone: string;
        quality_score: number;
        sound_most_like: string;
      }>;
    }>;
  };
  textScore?: { // Added camelCase version sent by backend
      speechace_score: {
          pronunciation: number;
      };
      quality_score?: number; // Some versions might have this
  };
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
          questionId: 'vocabulary-drill', // Generic context for now
        }
      });
      
      return response.data.data;
    } catch (error: any) {
      logger.error('SpeechAce Scoring Error:', error.message);
      throw error;
    }
  }
};
