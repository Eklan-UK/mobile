import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';

interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
}

interface ConversationOptions {
  messages: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface ScenarioOptions {
  scenario: string;
  userMessage: string;
  conversationHistory?: ConversationMessage[];
  temperature?: number;
}

/**
 * AI service for conversations and scenarios
 * Integrates with Gemini AI via backend API
 */
export const aiService = {
  /**
   * Send a message in a conversation
   */
  async sendConversationMessage(options: ConversationOptions): Promise<string> {
    try {
      logger.log('📤 Sending conversation message:', {
        messageCount: options.messages.length,
        lastMessage: options.messages[options.messages.length - 1]?.content?.substring(0, 50),
      });

      const response = await apiClient.post('/api/v1/ai/conversation', {
        messages: options.messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to get AI response');
      }

      const aiResponse = response.data?.data?.response;
      logger.log('✅ Received AI response:', aiResponse?.substring(0, 50));
      
      return aiResponse || '';
    } catch (error: any) {
      logger.error('❌ Error sending conversation message:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get AI response');
    }
  },

  /**
   * Send a message in a scenario-based conversation
   */
  async sendScenarioMessage(options: ScenarioOptions): Promise<string> {
    try {
      logger.log('📤 Sending scenario message:', {
        scenario: options.scenario,
        message: options.userMessage?.substring(0, 50),
      });

      // Build conversation history format
      const messages: ConversationMessage[] = options.conversationHistory || [];
      messages.push({ role: 'user', content: options.userMessage });

      const response = await apiClient.post('/api/v1/ai/scenario', {
        scenario: options.scenario,
        userMessage: options.userMessage,
        conversationHistory: options.conversationHistory,
        temperature: options.temperature,
      });

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to get scenario response');
      }

      const aiResponse = response.data?.data?.response;
      logger.log('✅ Received scenario response:', aiResponse?.substring(0, 50));
      
      return aiResponse || '';
    } catch (error: any) {
      logger.error('❌ Error sending scenario message:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get scenario response');
    }
  },

  /**
   * Get initial greeting for a scenario
   */
  async getScenarioGreeting(scenario: string): Promise<string> {
    try {
      logger.log('📤 Getting scenario greeting:', scenario);

      const response = await apiClient.get('/api/v1/ai/scenario/greeting', {
        params: {
          scenario: scenario,
        },
      });

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to get scenario greeting');
      }

      const greeting = response.data?.data?.greeting;
      logger.log('✅ Received scenario greeting:', greeting?.substring(0, 50));
      
      return greeting || '';
    } catch (error: any) {
      logger.error('❌ Error getting scenario greeting:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get scenario greeting');
    }
  },

  /**
   * Analyze pronunciation from audio using Gemini Native Audio
   */
  async analyzePronunciationAudio(
    audioUri: string,
    expectedText: string,
    language?: string
  ): Promise<{
    transcription: string;
    accuracy: number;
    feedback?: string;
    phonemes?: any[];
  }> {
    try {
      logger.log('🎤 Analyzing pronunciation with Gemini:', {
        expectedText,
        audioUri: audioUri.substring(0, 50) + '...',
      });

      // Create FormData for audio upload
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('expectedText', expectedText);
      if (language) formData.append('language', language);

      const response = await apiClient.post('/api/v1/ai/pronunciation/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to analyze pronunciation');
      }

      const result = response.data?.data;
      logger.log('✅ Pronunciation analysis result:', {
        accuracy: result.accuracy,
        transcription: result.transcription?.substring(0, 50),
      });

      return result;
    } catch (error: any) {
      logger.error('❌ Error analyzing pronunciation:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to analyze pronunciation');
    }
  },

  /**
   * Send voice message in conversation using Gemini Native Audio
   */
  async sendVoiceMessage(
    audioUri: string,
    conversationHistory?: ConversationMessage[],
    context?: string
  ): Promise<string> {
    try {
      logger.log('🎤 Sending voice message:', {
        audioUri: audioUri.substring(0, 50) + '...',
        historyLength: conversationHistory?.length || 0,
      });

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      if (conversationHistory) {
        formData.append('conversationHistory', JSON.stringify(conversationHistory));
      }
      if (context) {
        formData.append('context', context);
      }

      const response = await apiClient.post('/api/v1/ai/voice/conversation', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to process voice message');
      }

      const aiResponse = response.data?.data?.response;
      logger.log('✅ Received voice response:', aiResponse?.substring(0, 50));
      
      return aiResponse || '';
    } catch (error: any) {
      logger.error('❌ Error sending voice message:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to process voice message');
    }
  },

  /**
   * Analyze listening comprehension from audio
   */
  async analyzeListeningComprehension(
    audioUri: string,
    questions: Array<{ question: string; correctAnswer: string }>
  ): Promise<{
    answers: Array<{ question: string; answer: string; isCorrect: boolean }>;
    overallScore: number;
    feedback: string;
  }> {
    try {
      logger.log('🎧 Analyzing listening comprehension:', {
        audioUri: audioUri.substring(0, 50) + '...',
        questionCount: questions.length,
      });

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('questions', JSON.stringify(questions));

      const response = await apiClient.post('/api/v1/ai/listening/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to analyze listening comprehension');
      }

      const result = response.data?.data;
      logger.log('✅ Listening comprehension result:', {
        score: result.overallScore,
        answerCount: result.answers?.length,
      });

      return result;
    } catch (error: any) {
      logger.error('❌ Error analyzing listening comprehension:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to analyze listening comprehension');
    }
  },
};


