import apiClient, { API_BASE_URL } from '@/lib/api';
// Note: expo-av and expo-file-system need to be installed:
// npx expo install expo-av expo-file-system
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { logger } from "@/utils/logger";

// Type assertion for cacheDirectory (expo-file-system v19+)
// The properties exist at runtime but TypeScript types may not expose them
const getCacheDirectory = () => {
  const fs = FileSystem as any;
  return fs.cacheDirectory || fs.documentDirectory || '';
};

interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface TTSResponse {
  audioUrl?: string;
  audioBlob?: Blob;
}

/**
 * TTS Service for Mobile
 * Supports both Speechase and ElevenLabs TTS
 */
class TTSService {
  private sound: Audio.Sound | null = null;
  private currentAudioUri: string | null = null;
  /** Resolve function for the pending playAudio promise; called by stopAudio so callers unblock. */
  private playbackFinishResolve: (() => void) | null = null;

  /**
   * Generate TTS audio using backend API
   * Backend will handle Speechase or ElevenLabs based on configuration
   */
  async generateTTS(options: TTSOptions): Promise<string> {
    try {
      // First, check if audio is cached on server
      try {
        const cacheResponse = await apiClient.get('/api/v1/tts', {
          params: {
            text: options.text,
            voice: options.voiceId || 'default',
          },
        });

        // If cached and has audioUrl, return it
        if (cacheResponse.data?.data?.cached && cacheResponse.data?.data?.audioUrl) {
          logger.log('TTS cache hit, using cached audio');
          return cacheResponse.data.data.audioUrl;
        }
        
        // If not cached (cached: false, audioUrl: null), that's fine - proceed to generate
        // Don't throw error here, just proceed to POST request
        logger.log('TTS cache miss, will generate new audio');
      } catch (cacheError) {
        // Only log warning, don't throw - proceed to generate
        logger.warn('Cache check failed, proceeding to generate:', cacheError);
      }

      // Generate new TTS audio - use fetch instead of axios for blob handling
      const token = await this.getAuthToken();
      
      const requestBody = {
        text: options.text,
        voice: options.voiceId || 'default',
        modelId: options.modelId,
        stability: options.stability,
        similarityBoost: options.similarityBoost,
        style: options.style,
        useSpeakerBoost: options.useSpeakerBoost,
      };
      
      logger.log('🔵 TTS POST Request:', {
        url: `${API_BASE_URL}/api/v1/tts`,
        method: 'POST',
        hasToken: !!token,
        body: requestBody,
      });
      
      const response = await fetch(`${API_BASE_URL}/api/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      logger.log('📥 TTS POST Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        // If response is JSON, it might be an error
        const contentType = response.headers.get('content-type');
        logger.log('❌ TTS Error Response:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          isJSON: contentType?.includes('application/json'),
        });
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          
          // Check for specific error codes that should be handled gracefully FIRST
          if (errorData.code === 'ConfigError' || errorData.code === 'TTSError') {
            // Log as warning since we're handling it gracefully
            logger.warn('⚠️ TTS service not configured, continuing without audio:', {
              status: response.status,
              statusText: response.statusText,
              errorCode: errorData.code,
              errorMessage: errorData.message,
              fullErrorData: errorData,
            });
            return '';
          }
          
          // For other errors, log as error and throw
          logger.error('📋 TTS Error Details:', {
            status: response.status,
            statusText: response.statusText,
            errorCode: errorData.code,
            errorMessage: errorData.message,
            fullErrorData: errorData,
            errorKeys: Object.keys(errorData),
          });
          
          const errorMessage = errorData.message || 'TTS generation failed';
          logger.error('🚨 Throwing TTS error:', errorMessage);
          throw new Error(errorMessage);
        }
        
        // Try to get response text for non-JSON errors
        let errorText = response.statusText;
        try {
          errorText = await response.text();
        } catch (e) {
          logger.warn('Could not read error response text:', e);
        }
        
        logger.error('🚨 TTS API error (non-JSON):', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        
        throw new Error(`TTS API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      // Check if response is JSON (cached URL) or blob (audio)
      const contentType = response.headers.get('content-type');
      logger.log('📦 TTS Response Content Type:', {
        contentType,
        isJSON: contentType?.includes('application/json'),
        isAudio: contentType?.includes('audio'),
      });
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        logger.log('📋 TTS JSON Response Data:', {
          code: data.code,
          message: data.message,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : [],
          fullData: data,
        });
        
        // Check for error codes first
        if (data.code === 'ConfigError' || data.code === 'TTSError') {
          logger.error('🚨 TTS Config/Service Error in JSON response:', {
            code: data.code,
            message: data.message,
            fullData: data,
          });
          throw new Error(data.message || 'TTS service not configured');
        }
        
        // If we have an audioUrl, return it
        if (data.data?.audioUrl) {
          return data.data.audioUrl;
        }
        
        // If we get a success response but no audioUrl and it's not cached,
        // this shouldn't happen in normal flow - but don't throw error here
        // as the API should return proper error codes
        if (data.data?.cached === false && !data.data?.audioUrl && data.code === 'ConfigError') {
          throw new Error(data.message || 'TTS service not configured');
        }
        
        // If we get here with no audioUrl, something unexpected happened
        // Log it but don't throw - let it fall through to blob handling
        if (!data.data?.audioUrl) {
          logger.warn('TTS POST returned JSON but no audioUrl, will try blob response');
        }
        
        // If we have a message indicating failure, throw it
        if (data.message && data.message !== 'Success' && data.code !== 'Success') {
          throw new Error(data.message);
        }
      }

      // Get audio blob
      const audioBlob = await response.blob();
      
      // Save audio blob to file system
      const audioUri = await this.saveAudioBlob(audioBlob, options.text);
      return audioUri;
    } catch (error: any) {
      logger.error('🚨 TTS generation failed - Full Error Details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        errorType: typeof error,
        errorKeys: Object.keys(error),
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      // Fallback to direct ElevenLabs if backend fails (and not auth error)
      // Only try fallback if it's a TTS configuration issue, not auth
      if (error.message && 
          !error.message.includes('401') && 
          !error.message.includes('Unauthorized') &&
          (error.message.includes('TTS service not configured') || 
           error.message.includes('TTS generation failed'))) {
        logger.log('🔄 Attempting ElevenLabs fallback...');
        try {
          return await this.generateElevenLabsDirect(options);
        } catch (fallbackError: any) {
          logger.error('❌ ElevenLabs fallback also failed:', {
            message: fallbackError.message,
            name: fallbackError.name,
            stack: fallbackError.stack,
          });
          // Don't throw - return empty string to prevent app crash
          logger.warn('⚠️ TTS unavailable, continuing without audio');
          return '';
        }
      }
      
      // For other errors (auth, network, etc), return empty string gracefully
      logger.warn('⚠️ TTS generation failed, continuing without audio:', {
        errorMessage: error.message,
        errorName: error.name,
      });
      return '';
    }
  }

  /**
   * Get auth token from secure storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { secureStorage } = await import('@/lib/secure-storage');
      return await secureStorage.getToken();
    } catch {
      return null;
    }
  }

  /**
   * Direct ElevenLabs API call (fallback)
   */
  private async generateElevenLabsDirect(options: TTSOptions): Promise<string> {
    const ELEVEN_LABS_API_KEY = process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY;
    
    if (!ELEVEN_LABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0.0,
          use_speaker_boost: options.useSpeakerBoost !== undefined ? options.useSpeakerBoost : true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const audioBlob = await response.blob();
    return await this.saveAudioBlob(audioBlob, options.text);
  }

  /**
   * Save audio blob to file system
   */
  private async saveAudioBlob(blob: Blob, text: string): Promise<string> {
    try {
      // Create a hash from text for filename
      const hash = text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `tts_${hash}_${Date.now()}.mp3`;
      const cacheDir = getCacheDirectory();
      const fileUri = `${cacheDir}${filename}`;

      // Convert blob to base64 using FileReader (available in React Native).
      // Avoids the O(n) string-concat loop that was blocking the JS thread.
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write to file system using legacy API
      // The legacy API supports EncodingType enum
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
      });

      return fileUri;
    } catch (error) {
      logger.error('Error saving audio blob:', error);
      throw new Error('Failed to save audio file');
    }
  }

  /**
   * Play audio from URI
   */
  async playAudio(audioUri: string, onFinish?: () => void): Promise<void> {
    if (!audioUri || audioUri.trim() === '') {
      logger.warn('Cannot play audio: empty URI');
      return;
    }

    try {
      // Stop any currently playing audio
      await this.stopAudio();

      // Load then explicitly play — some RN/Expo builds do not reliably start
      // playback with shouldPlay: true on createAsync alone.
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });

      this.sound = sound;
      this.currentAudioUri = audioUri;

      // Wait for audio to finish (or be cancelled via stopAudio) before resolving.
      // This keeps the calling effect in "ai_speaking" phase until the line is done,
      // preventing the effect cleanup from killing audio the moment setPhase fires.
      await new Promise<void>((resolve) => {
        this.playbackFinishResolve = resolve;
        const finishAndRelease = () => {
          void sound
            .unloadAsync()
            .catch(() => {})
            .finally(() => {
              if (this.sound === sound) {
                this.sound = null;
                this.currentAudioUri = null;
              }
              resolve();
            });
        };
        sound.setOnPlaybackStatusUpdate((status) => {
          if ((status as any).isLoaded && (status as any).didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            this.playbackFinishResolve = null;
            if (onFinish) onFinish();
            finishAndRelease();
          }
        });
        sound.playAsync().catch(() => {
          this.playbackFinishResolve = null;
          sound.setOnPlaybackStatusUpdate(null);
          finishAndRelease();
        });
      });
    } catch (error) {
      logger.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Stop currently playing audio. Also resolves any pending playAudio promise
   * so callers (effects) can unblock and check their cancellation flags.
   */
  async stopAudio(): Promise<void> {
    // Unblock any pending playAudio promise first
    if (this.playbackFinishResolve) {
      const resolve = this.playbackFinishResolve;
      this.playbackFinishResolve = null;
      resolve();
    }
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        logger.error('Error stopping audio:', error);
      }
      this.sound = null;
    }
    this.currentAudioUri = null;
  }

  /**
   * Check if audio is currently playing
   */
  async isPlaying(): Promise<boolean> {
    if (!this.sound) return false;
    
    try {
      const status = await this.sound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopAudio();
    this.currentAudioUri = null;
  }
}

export const ttsService = new TTSService();

