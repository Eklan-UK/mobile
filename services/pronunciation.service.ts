import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';

export interface PronunciationProblem {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  phonemes: string[];
  type?: 'word' | 'sound' | 'sentence';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeMinutes?: number;
  wordCount?: number;
  isActive?: boolean;
  order?: number;
}

export interface PronunciationWord {
  _id: string;
  word: string;
  ipa: string;
  phonemes: string[];
  type: 'word' | 'sound' | 'sentence';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  audioUrl?: string;
  audioFileName?: string;
  audioDuration?: number;
  useTTS: boolean;
  order: number;
  problemId: string;
  isActive?: boolean;
}

export interface PronunciationProgress {
  nextWord?: PronunciationWord;
  wordProgress?: Record<string, {
    attempts: number;
    bestScore: number;
    passed: boolean;
  }>;
}

export const pronunciationService = {
  /**
   * Get all pronunciation problems (optionally filtered by type)
   */
  getAllProblems: async (params?: {
    difficulty?: string;
    type?: 'word' | 'sound' | 'sentence';
    isActive?: boolean;
  }): Promise<PronunciationProblem[]> => {
    try {
      const response = await apiClient.get('/api/v1/pronunciation-problems', { params });
      return response.data?.data?.problems || [];
    } catch (error: any) {
      logger.error('Failed to fetch pronunciation problems:', error);
      throw error;
    }
  },

  /**
   * Get problem by slug with words and progress
   */
  getProblemBySlug: async (slug: string): Promise<{
    problem: PronunciationProblem;
    words: PronunciationWord[];
    progress?: PronunciationProgress;
  }> => {
    try {
      logger.log('🔵 Fetching pronunciation problem:', { slug });
      const response = await apiClient.get(`/api/v1/pronunciation-problems/${slug}`);
      const result = response.data?.data || {};
      return result;
    } catch (error: any) {
      logger.error('❌ Failed to fetch pronunciation problem:', {
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  },

  /**
   * Get words in a problem
   */
  getWords: async (slug: string): Promise<PronunciationWord[]> => {
    try {
      const response = await apiClient.get(`/api/v1/pronunciation-problems/${slug}/words`);
      return response.data?.data?.words || [];
    } catch (error: any) {
      logger.error('Failed to fetch pronunciation words:', error);
      throw error;
    }
  },

  /**
   * Submit pronunciation attempt for a word
   */
  submitAttempt: async (
    wordId: string,
    audioBase64: string,
    text: string
  ): Promise<any> => {
    try {
      const response = await apiClient.post(`/api/v1/pronunciation-words/${wordId}/attempt`, {
        audioBase64,
        text,
      });
      return response.data?.data;
    } catch (error: any) {
      logger.error('Failed to submit pronunciation attempt:', error);
      throw error;
    }
  },
};

