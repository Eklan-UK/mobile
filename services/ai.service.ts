import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';
import * as FileSystem from 'expo-file-system';

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
   * Transcribe an audio file using either Gemini or a dedicated stt service (currently using Gemini internally via sendVoiceMessage logic extracted)
   */
  async transcribeAudio(uri: string, languageCode: string = 'en'): Promise<string> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const response = await apiClient.post('/api/v1/ai/voice', {
        audioData: fileContent,
        history: [], // No history needed for just transcription
        context: "Please only transcribe the following audio directly. Do not respond to it, just transcribe exactly what is said.",
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to transcribe audio');
      }

      // We extract the transcription from our standardized backend schema
      // Since sendVoiceMessage used to return just the response, we assume the backend returns text.
      return response.data?.data || '';
    } catch (error: any) {
      logger.error('❌ Error transcribing audio:', error);
      throw new Error(error.response?.data?.message || 'Failed to transcribe audio');
    }
  },

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

  // ─── Native SSE Streaming for React Native (XHR) ──────────────────────────

  /**
   * React Native's `fetch` does not polyfill ReadableStream perfectly.
   * To consume chunks as they arrive, we use XMLHttpRequest directly.
   */
  _processSSEStreamXHR(url: string, body: any | null, onChunk: (chunk: { type: 'audio'|'text'|'metadata'; data: any }) => void): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(body ? 'POST' : 'GET', apiClient.defaults.baseURL + url, true);
      
      // ⚠️ XHR bypasses the Axios interceptor, so we must read the token ourselves.
      // Use the cached token to avoid hitting SecureStore on every SSE request.
      try {
        const { getCachedToken } = await import('@/lib/api');
        const token = await getCachedToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      } catch (e) {
        logger.error('❌ SSE XHR: Failed to read token', e);
      }
      
      xhr.setRequestHeader('Accept', 'text/event-stream');
      if (body) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }

      let processedIndex = 0;

      xhr.onreadystatechange = () => {
        // State 3 (LOADING) or 4 (DONE) has responseText
        if ((xhr.readyState === 3 || xhr.readyState === 4) && xhr.status === 200) {
          const responseText = xhr.responseText;
          if (responseText) {
            const newText = responseText.substring(processedIndex);
            if (newText) {
              const lines = newText.split('\n\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.substring(6).trim();
                    if (jsonStr) {
                      const chunk = JSON.parse(jsonStr);
                      onChunk(chunk);
                    }
                  } catch (e) {
                    // Incomplete chunk, wait for next tick
                  }
                }
              }
              // Update processed index to the last complete chunk boundary
              const lastDoubleNewline = responseText.lastIndexOf('\n\n');
              if (lastDoubleNewline !== -1 && lastDoubleNewline >= processedIndex) {
                 processedIndex = lastDoubleNewline + 2;
              }
            }
          }
        }
        
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Stream failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during stream'));
      xhr.send(body ? JSON.stringify(body) : null);
    });
  },

  /**
   * Stream the Drills (Roleplay) greeting via SSE
   */
  async streamDrillPracticeGreeting(
    drillId: string,
    onChunk: (chunk: { type: 'audio' | 'text' | 'metadata'; data: any }) => void
  ): Promise<void> {
    try {
      logger.log('📥 Streaming drill practice greeting...', drillId);
      await this._processSSEStreamXHR(`/api/v1/ai/drill-practice/greeting?drillId=${drillId}`, null, onChunk);
    } catch (error: any) {
      logger.error('❌ Error streaming drill practice greeting:', error);
      throw error;
    }
  },

  /**
   * Stream a Drill practice message via SSE
   */
  async streamDrillPracticeMessage(
    options: { drillId: string; userMessage: string; conversationHistory?: ConversationMessage[] },
    onChunk: (chunk: { type: 'audio' | 'text' | 'metadata'; data: any }) => void
  ): Promise<void> {
    try {
      logger.log('📥 Streaming drill practice message...', options.drillId);
      await this._processSSEStreamXHR('/api/v1/ai/drill-practice', options, onChunk);
    } catch (error: any) {
      logger.error('❌ Error streaming drill practice message:', error);
      throw error;
    }
  },

  /**
   * Stream the Topic (Free Talk) greeting via SSE
   */
  async streamTopicPracticeGreeting(
    topic: string,
    onChunk: (chunk: { type: 'audio' | 'text' | 'metadata'; data: any }) => void
  ): Promise<void> {
    try {
      logger.log('📥 Streaming topic practice greeting...', topic);
      await this._processSSEStreamXHR(`/api/v1/ai/topic-practice/greeting?topic=${topic}`, null, onChunk);
    } catch (error: any) {
      logger.error('❌ Error streaming topic practice greeting:', error);
      throw error;
    }
  },

  /**
   * Stream a Topic practice message via SSE
   */
  async streamTopicPracticeMessage(
    options: { topic: string; userMessage: string; conversationHistory?: ConversationMessage[] },
    onChunk: (chunk: { type: 'audio' | 'text' | 'metadata'; data: any }) => void
  ): Promise<void> {
    try {
      logger.log('📥 Streaming topic practice message...', options.topic);
      await this._processSSEStreamXHR('/api/v1/ai/topic-practice', options, onChunk);
    } catch (error: any) {
      logger.error('❌ Error streaming topic practice message:', error);
      throw error;
    }
  }
};


