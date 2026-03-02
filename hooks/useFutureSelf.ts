import apiClient from '@/lib/api';
import { secureStorage } from '@/lib/secure-storage';
import { Alert } from '@/utils/alert';
import { logger } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Video } from 'expo-av';

export type CameraFacing = 'front' | 'back';
export type ViewMode = 'camera' | 'preview' | 'player';

export interface FutureSelfVideo {
  _id: string;
  videoUrl: string;
  publicId: string;
  duration?: number;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  createdAt: string;
}

/**
 * useFutureSelf
 *
 * Encapsulates all recording, upload, and deletion logic for the Future Self screen.
 * UI components receive state and callbacks from this hook, keeping them pure and testable.
 */
export function useFutureSelf() {
  const queryClient = useQueryClient();

  // ── Recording state ──────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('front');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  // ── Upload state ──────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  // ── Deletion state ────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Timer helpers ─────────────────────────────────────────
  const startRecordingTimer = () => {
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Camera ────────────────────────────────────────────────
  const toggleCamera = () =>
    setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'));

  // ── Recording ─────────────────────────────────────────────
  const handleStartRecording = async (
    cameraPermissionGranted: boolean,
    micPermissionGranted: boolean,
    requestCameraPermission: () => Promise<any>,
    requestMicPermission: () => Promise<any>,
    onRecordingComplete: (uri: string) => void,
  ) => {
    if (!cameraPermissionGranted) {
      Alert.alert('Permission Required', 'Camera permission is required to record videos.');
      await requestCameraPermission();
      return;
    }

    if (!micPermissionGranted) {
      Alert.alert('Permission Required', 'Microphone permission is required to record audio with videos.');
      await requestMicPermission();
      return;
    }

    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Error', 'Camera is not ready. Please wait a moment and try again.');
      return;
    }

    try {
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      startRecordingTimer();

      // Small stabilisation delay before calling recordAsync
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!cameraRef.current || !cameraReady) {
        setIsRecording(false);
        recordingStartTimeRef.current = null;
        stopRecordingTimer();
        Alert.alert('Error', 'Camera is not ready. Please try again.');
        return;
      }

      recordingPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: 300 });
      logger.log('Recording promise created');

      recordingPromiseRef.current!
        .then(video => {
          setProcessing(false);
          stopRecordingTimer();
          if (video?.uri) {
            setRecordedUri(video.uri);
            setIsRecording(false);
            recordingStartTimeRef.current = null;
            onRecordingComplete(video.uri);
          } else {
            logger.warn('Recording completed but no URI provided');
            setIsRecording(false);
            recordingStartTimeRef.current = null;
          }
          recordingPromiseRef.current = null;
        })
        .catch((error: any) => {
          stopRecordingTimer();
          const errorMessage = error?.message || String(error);
          const errorCode = error?.code || '';
          const isTooShort =
            errorMessage.includes('stopped before any data') ||
            errorMessage.includes('Recording was stopped') ||
            errorMessage.includes('recording was stopped before') ||
            errorCode === 'E_RECORDING_STOPPED' ||
            errorCode === 'ERR_VIDEO_RECORDING_FAILED';

          if (isTooShort) {
            Alert.alert('Recording Too Short', 'Please record for at least half a second to save the video.', [{ text: 'OK' }]);
          } else {
            logger.error('Error recording video:', error);
            Alert.alert('Error', 'Failed to record video');
          }

          setIsRecording(false);
          setProcessing(false);
          recordingStartTimeRef.current = null;
          recordingPromiseRef.current = null;
        });
    } catch (error: any) {
      logger.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
      stopRecordingTimer();
      recordingPromiseRef.current = null;
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      const durationMs = recordingStartTimeRef.current
        ? Date.now() - recordingStartTimeRef.current
        : 0;

      if (durationMs < 500) {
        Alert.alert('Recording Too Short', 'Please record for at least half a second', [{ text: 'OK' }]);
        setIsRecording(false);
        recordingStartTimeRef.current = null;
        stopRecordingTimer();
        return;
      }

      setProcessing(true);
      cameraRef.current.stopRecording();
    } catch (error) {
      logger.error('Error stopping recording:', error);
      setIsRecording(false);
      setProcessing(false);
      stopRecordingTimer();
      recordingStartTimeRef.current = null;
      recordingPromiseRef.current = null;
    }
  };

  // ── Upload ────────────────────────────────────────────────
  const handleUpload = async (uri: string, onPresent: () => void) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadComplete(false);
      onPresent(); // show upload bottom sheet
      logger.log('🚀 Starting video upload...');

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Video file not found');

      const videoDuration = recordingStartTimeRef.current
        ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        : 0;

      const token = await secureStorage.getToken();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      const formData = new FormData();
      formData.append('video', {
        uri,
        type: 'video/mp4',
        name: `future-self-${Date.now()}.mp4`,
      } as any);

      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable && event.total > 0) {
            const progress = Math.min((Math.min(event.loaded, event.total) / event.total) * 100, 100);
            setUploadProgress(Math.min(progress, 95));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              logger.log('✅ Upload complete!');
              setUploadProgress(100);
              resolve(response);
            } catch {
              reject(new Error('Failed to parse response'));
            }
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              if (xhr.responseText) {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
              }
            } catch { /* fallthrough */ }
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed: Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', `${API_BASE_URL}/api/v1/upload/video`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData as any);
      });

      const { url, publicId } = uploadResponse;

      await new Promise(resolve => setTimeout(resolve, 300));

      await apiClient.post('/api/v1/future-self', {
        videoUrl: url,
        publicId,
        duration: videoDuration,
      });

      setUploadComplete(true);
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ['future-self'] });
    } catch (error: any) {
      logger.error('Error uploading video:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to upload video');
      setUploading(false);
      setUploadProgress(0);
      setUploadComplete(false);
    }
  };

  const resetUpload = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setRecordedUri(null);
  };

  // ── Deletion ──────────────────────────────────────────────
  const handleDeleteVideo = (videoId: string) => {
    Alert.alert('Delete Video', 'Are you sure you want to delete this video?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(videoId);
            await apiClient.delete(`/api/v1/future-self/${videoId}`);
            queryClient.invalidateQueries({ queryKey: ['future-self'] });
            router.back();
          } catch (error: any) {
            logger.error('Error deleting video:', error);
            Alert.alert('Error', 'Failed to delete video');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return {
    // State
    isRecording,
    processing,
    cameraReady,
    setCameraReady,
    cameraFacing,
    recordingDuration,
    recordedUri,
    setRecordedUri,
    uploading,
    uploadProgress,
    uploadComplete,
    deletingId,
    // Animated
    pulseAnim,
    // Refs
    cameraRef,
    videoRef,
    // Handlers
    toggleCamera,
    handleStartRecording,
    handleStopRecording,
    handleUpload,
    resetUpload,
    handleDeleteVideo,
    formatDuration,
  };
}
