import { useState, useCallback, useRef, useEffect } from 'react';
import { ttsService } from '@/services/tts.service';
import { logger } from "@/utils/logger";

interface UseTTSOptions {
  autoPlay?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { autoPlay = true, onPlayStart, onPlayEnd, onError } = options;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUri, setCurrentAudioUri] = useState<string | null>(null);
  const audioUriCache = useRef<Map<string, string>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsService.cleanup();
    };
  }, []);

  const playAudio = useCallback(
    async (text: string, voiceId?: string) => {
      try {
        // Stop any currently playing audio
        await ttsService.stopAudio();
        setIsPlaying(false);
        setIsGenerating(true);

        // Check cache first
        const cacheKey = `${text}:${voiceId || 'default'}`;
        let audioUri = audioUriCache.current.get(cacheKey);

        if (!audioUri) {
          // Generate TTS audio
          audioUri = await ttsService.generateTTS({
            text,
            voiceId,
          });
          // Only cache if we got a valid URI
          if (audioUri && audioUri.trim() !== '') {
            audioUriCache.current.set(cacheKey, audioUri);
          }
        }

        // Only set and play if we have a valid URI
        if (!audioUri || audioUri.trim() === '') {
          setIsGenerating(false);
          setIsPlaying(false);
          logger.warn('TTS generated empty URI, skipping playback');
          return;
        }

        setCurrentAudioUri(audioUri);

        // Play audio (only if we got a valid URI)
        if (autoPlay) {
          try {
            await ttsService.playAudio(audioUri);
            setIsPlaying(true);
            setIsGenerating(false);
            onPlayStart?.();
          } catch (playError) {
            logger.error('Error playing audio:', playError);
            setIsGenerating(false);
            setIsPlaying(false);
            // Don't throw - just log the error
          }

          // Monitor playback status
          const checkStatus = setInterval(async () => {
            const playing = await ttsService.isPlaying();
            if (!playing && isPlaying) {
              setIsPlaying(false);
              onPlayEnd?.();
              clearInterval(checkStatus);
            }
          }, 100);

          // Cleanup interval after reasonable time (audio should be done)
          setTimeout(() => clearInterval(checkStatus), 60000);
        } else {
          setIsGenerating(false);
        }
      } catch (error: any) {
        setIsGenerating(false);
        setIsPlaying(false);
        onError?.(error);
        logger.error('TTS Error:', error);
      }
    },
    [autoPlay, onPlayStart, onPlayEnd, onError, isPlaying]
  );

  const stopAudio = useCallback(async () => {
    await ttsService.stopAudio();
    setIsPlaying(false);
  }, []);

  const pauseAudio = useCallback(async () => {
    await ttsService.stopAudio();
    setIsPlaying(false);
  }, []);

  const resumeAudio = useCallback(async () => {
    if (currentAudioUri) {
      await ttsService.playAudio(currentAudioUri);
      setIsPlaying(true);
    }
  }, [currentAudioUri]);

  return {
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,
    isGenerating,
    isPlaying,
    currentAudioUri,
  };
}

