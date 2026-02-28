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
      
      // Log the full response structure
      logger.log('📥 API Response Status:', response.status);
      logger.log('📥 API Response Data:', JSON.stringify(response.data, null, 2));
      logger.log('📥 Response Data Path:', {
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        dataDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
      });
      
      const result = response.data?.data || {};
      
      logger.log('📦 Parsed Result:', {
        hasProblem: !!result.problem,
        hasWords: !!result.words,
        wordsIsArray: Array.isArray(result.words),
        wordsLength: Array.isArray(result.words) ? result.words.length : 'not an array',
        wordsType: typeof result.words,
        problemKeys: result.problem ? Object.keys(result.problem) : [],
        firstWord: result.words?.[0] ? {
          keys: Object.keys(result.words[0]),
          word: result.words[0].word,
          type: result.words[0].type,
          _id: result.words[0]._id,
        } : 'no words',
      });
      
      return result;
    } catch (error: any) {
      logger.error('❌ Failed to fetch pronunciation problem:', {
        error: error.message,
        response: error.response?.data,
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

