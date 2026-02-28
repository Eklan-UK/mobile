import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';

export interface DailyFocus {
  _id: string;
  title: string;
  focusType: 'grammar' | 'vocabulary' | 'matching' | 'pronunciation' | 'general';
  practiceFormat: 'fill-in-blank' | 'matching' | 'multiple-choice' | 'vocabulary' | 'mixed';
  description?: string;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  showExplanationsAfterSubmission: boolean;
  fillInBlankQuestions: Array<{
    sentence: string;
    sentenceAudioUrl?: string;
    correctAnswer: string;
    options?: string[];
    optionsAudioUrls?: string[];
    hint?: string;
    explanation?: string;
  }>;
  matchingQuestions: Array<{
    left: string;
    leftAudioUrl?: string;
    right: string;
    rightAudioUrl?: string;
    hint?: string;
    explanation?: string;
  }>;
  multipleChoiceQuestions: Array<{
    question: string;
    questionAudioUrl?: string;
    options: string[];
    optionsAudioUrls?: string[];
    correctIndex: number;
    hint?: string;
    explanation?: string;
  }>;
  vocabularyQuestions: Array<{
    word: string;
    wordAudioUrl?: string;
    definition: string;
    definitionAudioUrl?: string;
    exampleSentence?: string;
    exampleAudioUrl?: string;
    pronunciation?: string;
    hint?: string;
    explanation?: string;
  }>;
  totalQuestions: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyFocusProgress {
  currentQuestionIndex: number;
  answers: Array<{
    questionType: string;
    questionIndex: number;
    userAnswer: any;
    isCorrect?: boolean;
    isSubmitted: boolean;
  }>;
  isCompleted?: boolean;
  finalScore?: number;
}

export interface DailyFocusCompleteResponse {
  message: string;
  score: number;
  streakUpdated: boolean;
  badgeUnlocked: {
    badgeId: string;
    badgeName: string;
    milestone: number;
  } | null;
}

/**
 * Daily Focus service for managing daily focus practice
 */
export const dailyFocusService = {
  /**
   * Get today's daily focus
   */
  async getToday(): Promise<DailyFocus | null> {
    try {
      logger.log('📤 Fetching today\'s daily focus');
      const response = await apiClient.get('/api/v1/daily-focus/today');
      
      if (response.data?.code === 'NotFound' || !response.data?.dailyFocus) {
        logger.log('✅ No daily focus found for today');
        return null;
      }

      logger.log('✅ Today\'s daily focus fetched successfully');
      return response.data.dailyFocus;
    } catch (error: any) {
      logger.error('❌ Error fetching today\'s daily focus:', error);
      // Return null instead of throwing - it's okay if there's no focus today
      if (error.response?.status === 404 || error.response?.data?.code === 'NotFound') {
        return null;
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch today\'s focus');
    }
  },

  /**
   * Get daily focus by ID
   */
  async getById(id: string): Promise<DailyFocus> {
    try {
      logger.log('📤 Fetching daily focus:', id);
      const response = await apiClient.get(`/api/v1/daily-focus/${id}`);
      
      if (!response.data?.dailyFocus) {
        throw new Error(response.data?.message || 'Daily focus not found');
      }

      logger.log('✅ Daily focus fetched successfully');
      return response.data.dailyFocus;
    } catch (error: any) {
      logger.error('❌ Error fetching daily focus:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch daily focus');
    }
  },

  /**
   * Get progress for a daily focus
   */
  async getProgress(id: string): Promise<DailyFocusProgress | null> {
    try {
      logger.log('📤 Fetching daily focus progress:', id);
      const response = await apiClient.get(`/api/v1/daily-focus/${id}/progress`);
      
      if (!response.data?.data?.progress) {
        return null;
      }

      logger.log('✅ Daily focus progress fetched successfully');
      return response.data.data.progress;
    } catch (error: any) {
      logger.error('❌ Error fetching daily focus progress:', error);
      // Return null if no progress exists yet
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch progress');
    }
  },

  /**
   * Save progress for a daily focus
   */
  async saveProgress(
    id: string,
    data: {
      currentQuestionIndex: number;
      answers: Array<{
        questionType: string;
        questionIndex: number;
        userAnswer: any;
        isCorrect?: boolean;
        isSubmitted: boolean;
      }>;
      isCompleted?: boolean;
      finalScore?: number;
    }
  ): Promise<DailyFocusProgress> {
    try {
      logger.log('📤 Saving daily focus progress:', id);
      const response = await apiClient.post(`/api/v1/daily-focus/${id}/progress`, data);
      
      if (!response.data?.data?.progress) {
        throw new Error(response.data?.message || 'Failed to save progress');
      }

      logger.log('✅ Daily focus progress saved successfully');
      return response.data.data.progress;
    } catch (error: any) {
      logger.error('❌ Error saving daily focus progress:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to save progress');
    }
  },

  /**
   * Complete a daily focus
   */
  async complete(
    id: string,
    data: {
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      timeSpent?: number;
      answers?: any[];
    }
  ): Promise<DailyFocusCompleteResponse> {
    try {
      logger.log('📤 Completing daily focus:', id);
      const response = await apiClient.post(`/api/v1/daily-focus/${id}/complete`, data);
      
      if (!response.data?.data) {
        throw new Error(response.data?.message || 'Failed to complete daily focus');
      }

      logger.log('✅ Daily focus completed successfully');
      return response.data.data;
    } catch (error: any) {
      logger.error('❌ Error completing daily focus:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to complete daily focus');
    }
  },
};











