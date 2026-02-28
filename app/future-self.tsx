import { AppText, Loader } from '@/components/ui';
import apiClient from '@/lib/api';
import { secureStorage } from '@/lib/secure-storage';
import tw from '@/lib/tw';
import { Alert } from '@/utils/alert';
import { formatTimeAgo } from '@/utils/date';
import { logger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { ResizeMode, Video } from 'expo-av';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FutureSelfVideo {
  _id: string;
  videoUrl: string;
  publicId: string;
  duration?: number;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  createdAt: string;
}

type ViewMode = 'camera' | 'preview' | 'player';
type CameraFacing = 'front' | 'back';

export default function FutureSelfScreen() {
  const params = useLocalSearchParams<{ mode?: string; uri?: string; videoId?: string; videoUrl?: string }>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [viewMode, setViewMode] = useState<ViewMode>(
    params.mode === 'preview' ? 'preview' : params.mode === 'player' ? 'player' : 'camera'
  );
  const [recordedUri, setRecordedUri] = useState<string | null>(params.uri || null);
  const [selectedVideo, setSelectedVideo] = useState<FutureSelfVideo | null>(
    params.videoId && params.videoUrl ? {
      _id: params.videoId,
      videoUrl: params.videoUrl,
      publicId: '',
      createdAt: new Date().toISOString()
    } : null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('front');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSheetPresented, setCameraSheetPresented] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoStatus, setVideoStatus] = useState<any>(null);

  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const uploadProgressAnim = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Bottom sheet refs
  const uploadProgressSheetRef = useRef<BottomSheetModal>(null);
  const cameraSheetRef = useRef<BottomSheetModal>(null);
  const previewSheetRef = useRef<BottomSheetModal>(null);

  // Pulse animation for recording button
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [viewMode]);

  // Request both camera and microphone permissions if not granted
  useEffect(() => {
    const requestPermissions = async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!microphonePermission?.granted) {
        await requestMicrophonePermission();
      }
    };
    
    if (cameraPermission && microphonePermission) {
      if (!cameraPermission.granted || !microphonePermission.granted) {
        requestPermissions();
      }
    }
  }, [cameraPermission, microphonePermission]);

  // Reset camera ready state when view mode changes
  useEffect(() => {
    if (viewMode !== 'camera') {
      setCameraReady(false);
    }
  }, [viewMode]);

  // Open camera sheet when viewMode is camera
  useEffect(() => {
    if (viewMode === 'camera') {
      const timer = setTimeout(() => {
        cameraSheetRef.current?.present();
        setCameraSheetPresented(true);
      }, 300);
      return () => {
        clearTimeout(timer);
        setCameraSheetPresented(false);
      };
    } else {
      setCameraSheetPresented(false);
      cameraSheetRef.current?.dismiss();
    }
  }, [viewMode]);

  // Open preview sheet when viewMode is preview
  useEffect(() => {
    if (viewMode === 'preview' && recordedUri) {
      const timer = setTimeout(() => {
        previewSheetRef.current?.present();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      previewSheetRef.current?.dismiss();
    }
  }, [viewMode, recordedUri]);

  // Reset video loading state when video changes
  useEffect(() => {
    if (viewMode === 'player' && selectedVideo) {
      setVideoLoading(true);
      setVideoError(false);
    }
  }, [viewMode, selectedVideo?._id]);

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

  const toggleCamera = () => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const handleStartRecording = async () => {
    // Check permissions before recording
    if (!cameraPermission?.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to record videos.');
      await requestCameraPermission();
      return;
    }
    
    if (!microphonePermission?.granted) {
      Alert.alert('Permission Required', 'Microphone permission is required to record audio with videos.');
      await requestMicrophonePermission();
      return;
    }

    if (!cameraRef.current) {
      logger.error('Camera ref is not available');
      Alert.alert('Error', 'Camera is not ready. Please wait a moment and try again.');
      return;
    }

    if (!cameraReady) {
      logger.error('Camera is not ready yet');
      Alert.alert('Error', 'Camera is still initializing. Please wait a moment and try again.');
      return;
    }

    try {
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      startRecordingTimer();

      logger.log('Starting video recording...');

      await new Promise(resolve => setTimeout(resolve, 300));

      if (!cameraRef.current || !cameraReady) {
        logger.error('Camera ref or ready state invalid after delay');
        setIsRecording(false);
        recordingStartTimeRef.current = null;
        stopRecordingTimer();
        Alert.alert('Error', 'Camera is not ready. Please try again.');
        return;
      }

      try {
        const camera = cameraRef.current;
        if (!camera) {
          throw new Error('Camera instance is null');
        }

        recordingPromiseRef.current = camera.recordAsync({
          maxDuration: 300,
        });
        logger.log('Recording promise created successfully');
      } catch (recordError: any) {
        logger.error('Error calling recordAsync:', recordError);
        setIsRecording(false);
        recordingStartTimeRef.current = null;
        stopRecordingTimer();
        const errorMsg = recordError?.message || 'Failed to start recording';
        Alert.alert('Error', errorMsg + '. Please try again.');
        return;
      }

      recordingPromiseRef.current!
        .then((video) => {
          logger.log('Recording completed, video:', video);
          setProcessing(false);
          stopRecordingTimer();
          if (video?.uri) {
            logger.log('Setting recorded URI:', video.uri);
            setRecordedUri(video.uri);
            setIsRecording(false);
            recordingStartTimeRef.current = null;
            setViewMode('preview');
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

          logger.log('Recording error:', errorMessage, errorCode);

          if (errorMessage.includes('stopped before any data') ||
            errorMessage.includes('Recording was stopped') ||
            errorMessage.includes('recording was stopped before') ||
            errorCode === 'E_RECORDING_STOPPED' ||
            errorCode === 'ERR_VIDEO_RECORDING_FAILED') {
            logger.log('Recording stopped early');
            Alert.alert(
              'Recording Too Short',
              'Please record for at least half a second to save the video.',
              [{ text: 'OK' }]
            );
            setIsRecording(false);
            setProcessing(false);
            recordingStartTimeRef.current = null;
            recordingPromiseRef.current = null;
            return;
          }

          logger.error('Error recording video:', error);
          Alert.alert('Error', 'Failed to record video');
          setIsRecording(false);
          setProcessing(false);
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
    if (cameraRef.current && isRecording) {
      try {
        const recordingDurationMs = recordingStartTimeRef.current
          ? Date.now() - recordingStartTimeRef.current
          : 0;

        logger.log('Stopping recording... Duration:', recordingDurationMs, 'ms');

        if (recordingDurationMs < 500) {
          Alert.alert(
            'Recording Too Short',
            'Please record for at least half a second',
            [{ text: 'OK' }]
          );
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
    }
  };

  const handleUpload = async () => {
    if (!recordedUri) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      uploadProgressAnim.setValue(0);
      setUploadComplete(false);
      uploadProgressSheetRef.current?.present();
      console.log('🚀 Starting video upload...');

      const fileInfo = await FileSystem.getInfoAsync(recordedUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }

      // Get video duration
      let videoDuration = 0;
      // Use recording duration if available
      if (recordingStartTimeRef.current) {
        videoDuration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        logger.log('Video duration from recording:', videoDuration, 'seconds');
      }

      const token = await secureStorage.getToken();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      const formData = new FormData();
      formData.append('video', {
        uri: recordedUri,
        type: 'video/mp4',
        name: `future-self-${Date.now()}.mp4`,
      } as any);

      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && event.total > 0) {
            // Cap progress at 100% to handle cases where loaded > total
            // Also cap the displayed bytes to match the actual file size
            const actualLoaded = Math.min(event.loaded, event.total);
            const progress = Math.min((actualLoaded / event.total) * 100, 100);
            console.log('📊 Upload progress:', progress.toFixed(2) + '%', `(${actualLoaded}/${event.total} bytes)`);
            logger.log('Upload progress:', progress);
            
            // Update both state and animated value (cap at 95% until upload completes)
            const cappedProgress = Math.min(progress, 95);
            setUploadProgress(cappedProgress);
            
            // Animate progress bar smoothly
            Animated.timing(uploadProgressAnim, {
              toValue: cappedProgress,
              duration: 100,
              useNativeDriver: false,
            }).start();
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('✅ Upload complete!');
              logger.log('✅ Upload successful:', response);
              setUploadProgress(100);
              Animated.timing(uploadProgressAnim, {
                toValue: 100,
                duration: 200,
                useNativeDriver: false,
              }).start();
              resolve(response);
            } catch (error) {
              logger.error('❌ Failed to parse upload response:', {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                error,
              });
              reject(new Error('Failed to parse response'));
            }
          } else {
            // Log detailed error information
            let errorMessage = `Upload failed with status ${xhr.status}`;
            let errorData = null;
            
            try {
              const responseText = xhr.responseText;
              if (responseText) {
                errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
                logger.error('❌ Upload error response:', {
                  status: xhr.status,
                  statusText: xhr.statusText,
                  errorCode: errorData.code,
                  errorMessage: errorData.message,
                  fullError: errorData,
                });
              } else {
                logger.error('❌ Upload error (no response body):', {
                  status: xhr.status,
                  statusText: xhr.statusText,
                  responseHeaders: xhr.getAllResponseHeaders(),
                });
              }
            } catch (parseError) {
              logger.error('❌ Upload error (failed to parse error response):', {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                responseTextLength: xhr.responseText?.length,
                parseError: parseError?.message || String(parseError),
              });
              // Use the raw response text if available
              if (xhr.responseText) {
                errorMessage = `Upload failed with status ${xhr.status}: ${xhr.responseText.substring(0, 200)}`;
              }
            }
            
            logger.error('🚨 Rejecting upload with error:', {
              errorMessage,
              status: xhr.status,
              hasErrorData: !!errorData,
            });
            
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', (event) => {
          logger.error('❌ Upload network error:', event);
          reject(new Error('Upload failed: Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', `${API_BASE_URL}/api/v1/upload/video`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData as any);
      });

      const { url, publicId } = uploadResponse;

      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 300));

      await apiClient.post('/api/v1/future-self', {
        videoUrl: url,
        publicId,
        duration: videoDuration,
      });

      setUploadComplete(true);
      setUploading(false);

      // Invalidate future self query to refresh the card on home screen
      queryClient.invalidateQueries({ queryKey: ['future-self'] });
    } catch (error: any) {
      logger.error('Error uploading video:', error);
      uploadProgressSheetRef.current?.dismiss();
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to upload video'
      );
      setUploading(false);
      setUploadProgress(0);
      setUploadComplete(false);
    }
  };

  const handleUploadDone = () => {
    uploadProgressSheetRef.current?.dismiss();
    setUploading(false);
    setUploadProgress(0);
    uploadProgressAnim.setValue(0);
    setUploadComplete(false);
    setRecordedUri(null);
    router.back();
  };

  const handleRetake = () => {
    previewSheetRef.current?.dismiss();
    setRecordedUri(null);
    setTimeout(() => {
      setViewMode('camera');
    }, 300);
  };

  const handleUseVideo = () => {
    previewSheetRef.current?.dismiss();
    handleUpload();
  };

  const handleDeleteVideo = async (videoId: string) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(videoId);
              await apiClient.delete(`/api/v1/future-self/${videoId}`);
              
              // Invalidate React Query cache to update home page card
              queryClient.invalidateQueries({ queryKey: ['future-self'] });
              logger.log('✅ Future self cache invalidated');
              
              router.back();
            } catch (error: any) {
              logger.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (viewMode === 'player') {
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
      router.back();
    } else if (viewMode === 'preview') {
      previewSheetRef.current?.dismiss();
      router.back();
    } else if (viewMode === 'camera') {
      cameraSheetRef.current?.dismiss();
      router.back();
    }
  };

  // Request permissions handler
  const handleRequestPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    if (!microphonePermission?.granted) {
      await requestMicrophonePermission();
    }
  };

  // Show loading while permissions are being checked
  if ((!cameraPermission || !microphonePermission) && viewMode === 'camera') {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  // Permission denied
  const hasAllPermissions = cameraPermission?.granted && microphonePermission?.granted;
  if (!hasAllPermissions && viewMode === 'camera') {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-6`}>
        <View style={tw`items-center bg-gray-900 rounded-3xl p-8`}>
          <View style={[tw`w-20 h-20 rounded-full items-center justify-center mb-6`, { backgroundColor: 'rgba(0,122,255,0.2)' }]}>
            <Ionicons name="camera" size={40} color="#007AFF" />
          </View>
          <AppText style={tw`text-white text-xl font-bold mb-2 text-center`}>
            Camera & Microphone Access Needed
          </AppText>
          <AppText style={tw`text-gray-400 text-center mb-8`}>
            We need camera and microphone permissions to record videos with audio for your future self
          </AppText>
          <TouchableOpacity
            onPress={handleRequestPermissions}
            style={[tw`w-full py-4 rounded-full items-center mb-3`, { backgroundColor: '#007AFF' }]}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-white font-semibold`}>Grant Permissions</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBack}
            style={[tw`w-full py-4 rounded-full items-center border-2 border-white`]}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-white font-semibold`}>Back</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Video Player View
  if (viewMode === 'player' && selectedVideo) {
    return (
      <SafeAreaView style={tw`flex-1 bg-black`} edges={[]}>
        <View style={tw`flex-1 bg-black`}>
          {/* Video Container */}
          <View style={tw`flex-1 relative`}>
            {/* Video Player */}
            <Video
              ref={videoRef}
              source={{ uri: selectedVideo.videoUrl }}
              style={tw`flex-1 bg-black`}
              useNativeControls={!videoLoading}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              onLoadStart={() => {
                setVideoLoading(true);
                setVideoError(false);
              }}
              onLoad={(status) => {
                setVideoStatus(status);
                setVideoLoading(false);
                setVideoError(false);
              }}
              onError={(error) => {
                logger.error('Video error:', error);
                setVideoLoading(false);
                setVideoError(true);
              }}
              onPlaybackStatusUpdate={(status) => {
                setVideoStatus(status);
              }}
            />

            {/* Loading Overlay */}
            {videoLoading && (
              <View style={tw`absolute inset-0 bg-black items-center justify-center`}>
                <View style={tw`items-center`}>
                  <ActivityIndicator size="large" color="#fff" />
                  <AppText style={tw`text-white text-base font-medium mt-4`}>
                    Loading video...
                  </AppText>
                </View>
              </View>
            )}

            {/* Error Overlay */}
            {videoError && (
              <View style={tw`absolute inset-0 bg-black items-center justify-center px-6`}>
                <View style={tw`items-center`}>
                  <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
                  <AppText style={tw`text-white text-lg font-semibold mt-4 mb-2 text-center`}>
                    Failed to load video
                  </AppText>
                  <AppText style={tw`text-gray-400 text-sm text-center mb-6`}>
                    Please check your connection and try again
                  </AppText>
                  <TouchableOpacity
                    onPress={() => {
                      setVideoError(false);
                      setVideoLoading(true);
                      if (videoRef.current) {
                        videoRef.current.loadAsync({ uri: selectedVideo.videoUrl });
                      }
                    }}
                    style={tw`bg-white rounded-full px-6 py-3`}
                  >
                    <AppText style={tw`text-black font-semibold`}>Retry</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Top Controls Overlay */}
            <View style={tw`absolute top-0 left-0 right-0 pt-12 pb-4 px-6`}>
              <View style={tw`flex-row justify-between items-center`}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={tw`w-10 h-10 rounded-full bg-black/60 items-center justify-center backdrop-blur-sm`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={tw`flex-row items-center gap-3`}>
                  {selectedVideo.createdAt && (
                    <View style={tw`bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm`}>
                      <AppText style={tw`text-white text-xs font-medium`}>
                        {formatTimeAgo(selectedVideo.createdAt)}
                      </AppText>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteVideo(selectedVideo._id)}
                    style={tw`w-10 h-10 rounded-full bg-black/60 items-center justify-center backdrop-blur-sm`}
                    activeOpacity={0.7}
                    disabled={deletingId === selectedVideo._id}
                  >
                    {deletingId === selectedVideo._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Bottom Info Overlay (when not loading and video is ready) */}
            {!videoLoading && !videoError && videoStatus && (
              <View style={tw`absolute bottom-0 left-0 right-0 pb-8 px-6`}>
                <View style={tw`bg-black/60 rounded-2xl p-4 backdrop-blur-sm`}>
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <AppText style={tw`text-white font-semibold text-base`}>
                      Message to Your Future Self
                    </AppText>
                    {videoStatus.durationMillis && (
                      <AppText style={tw`text-gray-300 text-sm`}>
                        {Math.floor(videoStatus.durationMillis / 1000)}s
                      </AppText>
                    )}
                  </View>
                  {selectedVideo.description && (
                    <AppText style={tw`text-gray-300 text-sm`} numberOfLines={2}>
                      {selectedVideo.description}
                    </AppText>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera View in Bottom Sheet
  if (viewMode === 'camera') {
    return (
      <SafeAreaView style={tw`flex-1 bg-black`} edges={[]}>
        <BottomSheetModal
          ref={cameraSheetRef}
          index={0}
          snapPoints={[SCREEN_HEIGHT]}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          enableHandlePanningGesture={false}
          android_keyboardInputMode="adjustResize"
          handleIndicatorStyle={{ display: 'none' }}
          backgroundStyle={{ backgroundColor: 'black' }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={1} />
          )}
          onDismiss={() => {
            setCameraSheetPresented(false);
            router.back();
          }}
        >
          <BottomSheetView style={{ flex: 1, height: SCREEN_HEIGHT, backgroundColor: 'black' }}>
            {cameraSheetPresented ? (
              <CameraView
                ref={cameraRef}
                style={{ flex: 1, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                facing={cameraFacing}
                mode="video"
                videoStabilizationMode="off"
                onCameraReady={() => {
                  logger.log('Camera is ready');
                  setCameraReady(true);
                }}
                onMountError={(error) => {
                  logger.error('Camera mount error:', error);
                  setCameraReady(false);
                  Alert.alert('Camera Error', 'Failed to initialize camera. Please try again.');
                }}
              >
                {/* Top Controls */}
                <View style={[tw`pt-12 pb-8 px-6`]}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <TouchableOpacity
                      onPress={() => {
                        cameraSheetRef.current?.dismiss();
                      }}
                      style={tw`p-2`}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    <View style={tw`flex-1`} />

                    <TouchableOpacity
                      onPress={toggleCamera}
                      style={tw`p-2`}
                      activeOpacity={0.7}
                      disabled={isRecording}
                    >
                      <Ionicons
                        name="camera-reverse-outline"
                        size={28}
                        color={isRecording ? '#666' : '#fff'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Bottom Controls */}
                <View style={tw`flex-1 justify-end items-center pb-12`}>
                  {processing ? (
                    <View style={tw`items-center mb-8`}>
                      <ActivityIndicator size="large" color="#fff" />
                      <AppText style={tw`text-white text-base font-semibold mt-4`}>
                        Processing...
                      </AppText>
                    </View>
                  ) : (
                    <View style={tw`items-center mb-8`}>
                      {/* Record button */}
                      <Animated.View
                        style={{
                          transform: [{ scale: pulseAnim }]
                        }}
                      >
                        <TouchableOpacity
                          onPress={isRecording ? handleStopRecording : handleStartRecording}
                          style={[
                            tw`w-20 h-20 rounded-full items-center justify-center`,
                            {
                              borderWidth: 4,
                              borderColor: '#fff',
                              backgroundColor: isRecording ? '#FF3B30' : 'transparent'
                            }
                          ]}
                          activeOpacity={0.7}
                        >
                          {!isRecording && (
                            <View style={[tw`w-16 h-16 rounded-full`, { backgroundColor: '#fff' }]} />
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  )}
                </View>
              </CameraView>
            ) : (
              <View style={tw`flex-1 items-center justify-center`}>
                <ActivityIndicator size="large" color="#fff" />
                <AppText style={tw`text-white mt-4`}>Loading camera...</AppText>
              </View>
            )}
          </BottomSheetView>
        </BottomSheetModal>
      </SafeAreaView>
    );
  }

  // Preview View Bottom Sheet
  if (viewMode === 'preview' && recordedUri) {
    return (
      <SafeAreaView style={tw`flex-1 bg-black`} edges={[]}>
        <BottomSheetModal
          ref={previewSheetRef}
          index={0}
          snapPoints={[SCREEN_HEIGHT]}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          enableHandlePanningGesture={false}
          handleIndicatorStyle={{ display: 'none' }}
          backgroundStyle={{ backgroundColor: 'black' }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={1} />
          )}
          onDismiss={() => {
            router.back();
          }}
        >
          <BottomSheetView style={{ flex: 1, height: SCREEN_HEIGHT, backgroundColor: 'black' }}>
            {/* Top header */}
            <View style={[tw`pt-12 pb-6 px-6`]}>
              <View style={tw`flex-row justify-between items-center`}>
                <AppText style={tw`text-white text-xl font-bold`}>Video recording</AppText>
                <TouchableOpacity
                  onPress={handleBack}
                  style={tw`p-2`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Video Preview */}
            <View style={tw`flex-1 items-center justify-center px-6`}>
              <View style={[tw`w-full rounded-3xl overflow-hidden`, { aspectRatio: 9 / 16, maxHeight: SCREEN_HEIGHT * 0.7 }]}>
                <Video
                  source={{ uri: recordedUri }}
                  style={tw`w-full h-full`}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  isLooping={false}
                />
              </View>
            </View>

            {/* Bottom buttons */}
            <View style={[tw`px-6 pt-6`, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
              <View style={tw`flex-row justify-between items-center`}>
                <TouchableOpacity
                  onPress={handleRetake}
                  activeOpacity={0.7}
                >
                  <AppText style={tw`text-white text-lg font-medium`}>Retake video</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUseVideo}
                  activeOpacity={0.7}
                  disabled={uploading}
                >
                  <AppText style={[tw`text-lg font-semibold`, { color: '#FFA500' }]}>Use this video</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Upload Progress Bottom Sheet */}
        <BottomSheetModal
          ref={uploadProgressSheetRef}
          index={0}
          snapPoints={['50%']}
          enablePanDownToClose={false}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
          )}
        >
          <BottomSheetView style={tw`px-6 pb-6 flex-1`}>
            {/* Close Button */}
            <View style={tw`items-end mb-4`}>
              <TouchableOpacity
                onPress={() => uploadProgressSheetRef.current?.dismiss()}
                style={tw`p-2`}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <AppText style={tw`text-2xl font-bold text-gray-900 mb-2`}>
              This is your starting point.
            </AppText>

            {/* Description */}
            <AppText style={tw`text-base text-gray-700 mb-6`}>
              We'll use this video to help track your confidence and fluency over time.
            </AppText>

            {/* File info */}
            <View style={tw`flex-row items-center bg-gray-50 rounded-2xl p-4 mb-6`}>
              <View style={[tw`w-14 h-14 rounded-xl items-center justify-center mr-4`, { backgroundColor: uploadComplete ? '#34C759' : '#9CA3AF' }]}>
                {uploadComplete ? (
                  <Ionicons name="checkmark" size={28} color="#fff" />
                ) : (
                  <Ionicons name="videocam" size={28} color="#fff" />
                )}
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-base font-semibold text-gray-900 mb-1`}>
                  {uploadComplete ? 'Video uploaded' : 'Video uploading'}
                </AppText>
                <AppText style={tw`text-sm text-gray-600`}>
                  {uploadComplete ? 'Upload complete' : '50MB Max'}
                </AppText>

                {/* Progress bar */}
                <View style={tw`mt-3`}>
                  <View style={[tw`h-1.5 bg-gray-200 rounded-full overflow-hidden`]}>
                    <Animated.View
                      style={[
                        tw`h-full rounded-full`,
                        {
                          width: uploadProgressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: uploadComplete ? '#34C759' : '#34C759'
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
              {!uploadComplete && uploading && (
                <View style={tw`p-2`}>
                  <ActivityIndicator size="small" color="#34C759" />
                </View>
              )}
              {!uploadComplete && !uploading && (
                <TouchableOpacity
                  style={tw`p-2`}
                  activeOpacity={0.7}
                  onPress={() => {
                    uploadProgressSheetRef.current?.dismiss();
                    setUploading(false);
                    setUploadProgress(0);
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Progress percentage */}
            <View style={tw`items-end mb-6`}>
              <AppText style={tw`text-sm font-semibold text-gray-900`}>
                {Math.round(uploadProgress)}%
              </AppText>
            </View>

            {/* Button */}
            <TouchableOpacity
              onPress={uploadComplete ? handleUploadDone : undefined}
              style={[
                tw`rounded-full py-4 items-center`,
                {
                  backgroundColor: '#34C759',
                  opacity: uploadComplete ? 1 : 0.5
                }
              ]}
              activeOpacity={0.8}
              disabled={!uploadComplete}
            >
              <AppText style={tw`text-white font-semibold text-lg`}>
                Alright, all good 👍
              </AppText>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>

      </SafeAreaView>
    );
  }

  // Default fallback
  return (
    <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
      <Loader />
    </SafeAreaView>
  );
}