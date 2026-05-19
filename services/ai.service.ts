import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';
import * as FileSystem from 'expo-file-system/legacy';
import type {
  FreeTalkScenarioSummary,
  FreeTalkScenario,
  FreeTalkAttemptGradeResult,
  FreeTalkAttempt,
  FreeTalkSSEChunk,
} from '@/types/free-talk';

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

      const body = response.data;
      const ok = body?.code === 'Success' || body?.success === true;
      if (!ok) {
        throw new Error(body?.message || 'Failed to transcribe audio');
      }

      // Same envelope as other /api/v1/ai/* routes: { code, data } or legacy { success, data }
      const raw = body?.data;
      if (typeof raw === 'string') {
        return raw;
      }
      if (raw && typeof raw === 'object') {
        return (
          (raw as { response?: string }).response ??
          (raw as { transcription?: string }).transcription ??
          (raw as { text?: string }).text ??
          ''
        );
      }
      return '';
    } catch (error: any) {
      logger.error('❌ Error transcribing audio:', error?.message ?? error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to transcribe audio'
      );
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
   *
   * XHR bypasses Axios, so expired access tokens get 401 with no automatic refresh.
   * Mirror the Axios interceptor once: refresh and retry exactly one time.
   */
  async _processSSEStreamXHR(url: string, body: any | null, onChunk: (chunk: { type: 'audio'|'text'|'metadata'; data: any }) => void): Promise<void> {
    const endpoint = apiClient.defaults.baseURL + url;
    let retried401 = false;

    while (true) {
      try {
        let token: string | null = null;
        try {
          const { getCachedToken } = await import('@/lib/api');
          token = await getCachedToken();
        } catch (e) {
          logger.error('❌ SSE XHR: Failed to read token', e);
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(body ? 'POST' : 'GET', endpoint, true);

          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.setRequestHeader('Accept', 'text/event-stream');
          if (body) {
            xhr.setRequestHeader('Content-Type', 'application/json');
          }

          let processedIndex = 0;
          const processingQueue: string[] = [];
          let isProcessing = false;

          const processChunks = () => {
            if (isProcessing || processingQueue.length === 0) return;
            isProcessing = true;

            const scheduleNext = typeof requestAnimationFrame !== 'undefined'
              ? requestAnimationFrame
              : (fn: () => void) => setTimeout(fn, 0);

            scheduleNext(() => {
              try {
                const chunks = processingQueue.splice(0, 10);
                for (const line of chunks) {
                  if (line.startsWith('data: ')) {
                    try {
                      const jsonStr = line.substring(6).trim();
                      if (jsonStr) {
                        const chunkJson = JSON.parse(jsonStr);
                        onChunk(chunkJson);
                      }
                    } catch {
                      // Incomplete chunk, skip
                    }
                  }
                }
              } finally {
                isProcessing = false;
                if (processingQueue.length > 0) {
                  processChunks();
                }
              }
            });
          };

          xhr.onreadystatechange = () => {
            if ((xhr.readyState === 3 || xhr.readyState === 4) && xhr.status === 200) {
              const responseText = xhr.responseText;
              if (responseText) {
                const newText = responseText.substring(processedIndex);
                if (newText) {
                  const lines = newText.split('\n\n');
                  for (const line of lines) {
                    if (line.trim()) {
                      processingQueue.push(line);
                    }
                  }
                  const lastDoubleNewline = responseText.lastIndexOf('\n\n');
                  if (lastDoubleNewline !== -1 && lastDoubleNewline >= processedIndex) {
                    processedIndex = lastDoubleNewline + 2;
                  }
                  processChunks();
                }
              }
            }

            if (xhr.readyState === 4) {
              const finalize = () => {
                if (xhr.status === 200) {
                  resolve();
                } else {
                  reject(new Error(`Stream failed with status ${xhr.status}`));
                }
              };

              if (processingQueue.length > 0) {
                processChunks();
                setTimeout(finalize, 100);
              } else {
                finalize();
              }
            }
          };

          xhr.onerror = () =>
            reject(new Error(`Network error during stream (status: ${xhr.status}, readyState: ${xhr.readyState})`));
          xhr.send(body ? JSON.stringify(body) : null);
        });

        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('401') || retried401) {
          throw e;
        }
        retried401 = true;

        const { refreshAccessTokenSilently, invalidateTokenCache } = await import('@/lib/api');
        const { secureStorage } = await import('@/lib/secure-storage');

        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) {
          logger.warn('SSE stream 401 — no refresh token, cannot retry');
          throw e;
        }

        try {
          await refreshAccessTokenSilently();
        } catch (refreshErr) {
          logger.error('❌ SSE stream: token refresh failed', refreshErr);
          await secureStorage.clearAll();
          invalidateTokenCache();
          throw refreshErr;
        }
      }
    }
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
  },

  // ─── Free Talk ──────────────────────────────────────────────────────────────

  /**
   * Fetch the ordered list of Free Talk scenario summaries.
   */
  async fetchFreeTalkScenarioSummaries(signal?: AbortSignal): Promise<FreeTalkScenarioSummary[]> {
    try {
      const response = await apiClient.get('/api/v1/ai/free-talk/scenarios', { signal });
      if (response.status === 402) throw new Error('Subscription required');
      const body = response.data;
      if (!body?.success) throw new Error(body?.message || 'Failed to fetch scenarios');
      return body.scenarios as FreeTalkScenarioSummary[];
    } catch (error: any) {
      if (error?.response?.status === 402) throw new Error('Subscription required');
      logger.error('❌ fetchFreeTalkScenarioSummaries:', error?.message ?? error);
      throw error;
    }
  },

  /**
   * Fetch a full scenario by ID (or random if omitted).
   */
  async fetchFreeTalkScenario(options: { scenarioId?: string; signal?: AbortSignal } = {}): Promise<FreeTalkScenario> {
    try {
      const params: Record<string, string> = {};
      if (options.scenarioId) params.scenarioId = options.scenarioId;
      const response = await apiClient.get('/api/v1/ai/free-talk/greeting', { params, signal: options.signal });
      if (response.status === 402) throw new Error('Subscription required');
      const body = response.data;
      if (!body?.success) throw new Error(body?.message || 'Failed to fetch scenario');
      return body.scenario as FreeTalkScenario;
    } catch (error: any) {
      if (error?.response?.status === 402) throw new Error('Subscription required');
      logger.error('❌ fetchFreeTalkScenario:', error?.message ?? error);
      throw error;
    }
  },

  /**
   * Stream Free Talk grading via SSE (XHR-based for React Native).
   */
  async streamFreeTalkGrading(
    options: { userResponse: string; scenarioId: string; signal?: AbortSignal },
    onChunk: (chunk: FreeTalkSSEChunk) => void
  ): Promise<void> {
    try {
      logger.log('📥 Streaming Free Talk grading...');
      await this._processSSEStreamXHR(
        '/api/v1/ai/free-talk',
        { userResponse: options.userResponse, scenarioId: options.scenarioId },
        onChunk as any
      );
    } catch (error: any) {
      if (error?.response?.status === 402 || error?.message?.includes('402')) {
        throw new Error('Subscription required');
      }
      logger.error('❌ streamFreeTalkGrading:', error?.message ?? error);
      throw error;
    }
  },

  /**
   * Transcribe an audio file via multipart POST to /api/v1/ai/transcribe.
   * Returns the transcript string.
   */
  async transcribeFreeTalkAudio(audioUri: string, mimeType = 'audio/m4a'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'recording.m4a',
        type: mimeType,
      } as any);
      const response = await apiClient.post('/api/v1/ai/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const body = response.data;
      const raw = body?.data;
      if (typeof raw === 'string') return raw;
      if (raw && typeof raw === 'object') {
        return (
          (raw as any).transcription ??
          (raw as any).response ??
          (raw as any).text ??
          ''
        );
      }
      return body?.transcription ?? '';
    } catch (error: any) {
      logger.error('❌ transcribeFreeTalkAudio:', error?.message ?? error);
      throw error;
    }
  },

  /**
   * Fetch TTS audio for Free Talk and return a local file URI for playback.
   * Uses main /api/v1/tts (staging does not reliably serve /ai/free-talk/tts).
   */
  async fetchFreeTalkTtsUri(text: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('TTS text is empty');
    }

    try {
      const { ttsService } = await import('./tts.service');
      const uri = await ttsService.generateTTS({ text: trimmed });
      if (!uri?.trim()) throw new Error('TTS unavailable');
      return uri;
    } catch (error: any) {
      logger.error('❌ fetchFreeTalkTtsUri:', error?.message ?? error);
      throw error;
    }
  },

  /**
   * Get the list of the learner's past Free Talk attempts (paginated).
   */
  async fetchFreeTalkAttempts(options: { limit?: number; cursor?: string; signal?: AbortSignal } = {}): Promise<{ attempts: FreeTalkAttempt[]; nextCursor: string | null }> {
    try {
      const params: Record<string, any> = { limit: options.limit ?? 50 };
      if (options.cursor) params.cursor = options.cursor;
      const response = await apiClient.get('/api/v1/ai/free-talk/attempts', { params, signal: options.signal });
      if (response.status === 402) throw new Error('Subscription required');
      const body = response.data;
      if (!body?.success) throw new Error(body?.message || 'Failed to fetch attempts');
      return { attempts: body.attempts as FreeTalkAttempt[], nextCursor: body.nextCursor ?? null };
    } catch (error: any) {
      if (error?.response?.status === 402) throw new Error('Subscription required');
      logger.error('❌ fetchFreeTalkAttempts:', error?.message ?? error);
      throw error;
    }
  },

  /**
   * Persist a completed Free Talk attempt (with optional audio).
   */
  async saveFreeTalkAttempt(
    body: {
      scenarioId: string;
      scenarioTitle: string;
      scenarioType: string;
      feedbackText?: string;
      gradeResult?: FreeTalkAttemptGradeResult | null;
      durationMs?: number;
      usedVoice?: boolean;
    },
    audioBlob?: { uri: string; mimeType: string } | null
  ): Promise<FreeTalkAttempt> {
    try {
      if (audioBlob) {
        const formData = new FormData();
        formData.append('payload', JSON.stringify(body));
        formData.append('audio', {
          uri: audioBlob.uri,
          name: 'recording.m4a',
          type: audioBlob.mimeType,
        } as any);
        const response = await apiClient.post('/api/v1/ai/free-talk/attempts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data?.attempt as FreeTalkAttempt;
      } else {
        const response = await apiClient.post('/api/v1/ai/free-talk/attempts', body);
        return response.data?.attempt as FreeTalkAttempt;
      }
    } catch (error: any) {
      logger.error('❌ saveFreeTalkAttempt:', error?.message ?? error);
      throw error;
    }
  },
};


