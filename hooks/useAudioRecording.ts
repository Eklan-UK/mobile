import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { setAudioModeSafely } from '@/utils/audio';
import { logger } from '@/utils/logger';

interface UseAudioRecordingOptions {
  onRecordingComplete?: (audioUri: string) => void;
  onError?: (error: Error) => void;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      if (!permissionResponse?.granted) {
        const response = await requestPermission();
        if (!response.granted) {
          const err = new Error('Microphone permission denied');
          setError(err);
          options.onError?.(err);
          return;
        }
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      logger.log('🎤 Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      setError(null);
      logger.log('✅ Recording started');
    } catch (err: any) {
      const error = new Error(`Failed to start recording: ${err.message}`);
      logger.error('❌ Failed to start recording:', error);
      setError(error);
      options.onError?.(error);
    }
  }, [permissionResponse, requestPermission, options]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || !isRecording) {
      return null;
    }

    try {
      logger.log('🛑 Stopping recording...');
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      recordingRef.current = null;
      setIsRecording(false);
      setAudioUri(uri);
      options.onRecordingComplete?.(uri);
      logger.log('✅ Recording stopped:', uri);
      
      return uri;
    } catch (err: any) {
      const error = new Error(`Failed to stop recording: ${err.message}`);
      logger.error('❌ Failed to stop recording:', error);
      setError(error);
      options.onError?.(error);
      setIsRecording(false);
      return null;
    }
  }, [isRecording, options]);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      } catch (err) {
        logger.warn('⚠️ Error canceling recording:', err);
      }
    }
    setIsRecording(false);
    setAudioUri(null);
  }, []);

  return {
    isRecording,
    audioUri,
    error,
    permissionResponse,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

