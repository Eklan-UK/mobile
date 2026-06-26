import apiClient, { isAxiosTimeout } from '@/lib/api';
import { celebrateBadgesFromResponse } from '@/lib/badges/celebrate-badge-unlock';
import { logger } from '@/utils/logger';
import type { BadgeUnlockCelebration } from '@/types/badge.types';

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
  badgesUnlocked?: BadgeUnlockCelebration[];
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
   * Get today's daily focus.
   * Returns null when the backend confirms there is genuinely no focus for today.
   * Throws for network errors and 5xx so React Query can retry and surface an error state.
   */
  async getToday(): Promise<DailyFocus | null> {
    logger.log("📤 Fetching today's daily focus");

    let response;
    try {
      response = await apiClient.get('/api/v1/daily-focus/today');
    } catch (error: any) {
      // 404 with NotFound code → no focus today, not an error
      if (
        error.response?.status === 404 ||
        error.response?.data?.code === 'NotFound'
      ) {
        logger.log('✅ No daily focus found for today (404)');
        return null;
      }
      // Slow backend — degrade to "no focus" so home screen stays usable
      if (isAxiosTimeout(error)) {
        logger.warn('⏱️ Daily focus request timed out; treating as no focus for today');
        return null;
      }
      // Network error, 401, 5xx, etc. → let React Query handle retry/error state
      logger.error('❌ Error fetching today\'s daily focus:', error.message);
      throw error;
    }

    if (response.data?.code === 'NotFound' || !response.data?.dailyFocus) {
      logger.log('✅ No daily focus found for today');
      return null;
    }

    logger.log('✅ Today\'s daily focus fetched successfully');
    return response.data.dailyFocus;
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
      celebrateBadgesFromResponse(response.data.data);
      return response.data.data;
    } catch (error: any) {
      logger.error('❌ Error completing daily focus:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to complete daily focus');
    }
  },
};











