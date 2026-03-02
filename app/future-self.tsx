import { Loader } from '@/components/ui';
import { CameraSheet } from '@/components/future-self/CameraSheet';
import { PermissionDeniedView } from '@/components/future-self/PermissionDeniedView';
import { PreviewSheet } from '@/components/future-self/PreviewSheet';
import { UploadProgressSheet } from '@/components/future-self/UploadProgressSheet';
import { VideoPlayerView } from '@/components/future-self/VideoPlayerView';
import tw from '@/lib/tw';
import { Alert } from '@/utils/alert';
import { useFutureSelf } from '@/hooks/useFutureSelf';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

type ViewMode = 'camera' | 'preview' | 'player';

export default function FutureSelfScreen() {
  const params = useLocalSearchParams<{ mode?: string; uri?: string; videoId?: string; videoUrl?: string }>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>(
    params.mode === 'preview' ? 'preview' : params.mode === 'player' ? 'player' : 'camera'
  );

  const [selectedVideo, setSelectedVideo] = useState<FutureSelfVideo | null>(
    params.videoId && params.videoUrl
      ? { _id: params.videoId, videoUrl: params.videoUrl, publicId: '', createdAt: new Date().toISOString() }
      : null
  );

  const [cameraSheetPresented, setCameraSheetPresented] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoStatus, setVideoStatus] = useState<any>(null);

  // Bottom sheet refs
  const uploadProgressSheetRef = useRef<BottomSheetModal>(null);
  const cameraSheetRef = useRef<BottomSheetModal>(null);
  const previewSheetRef = useRef<BottomSheetModal>(null);

  // All business logic lives in the hook
  const {
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
    pulseAnim,
    cameraRef,
    videoRef,
    toggleCamera,
    handleStartRecording,
    handleStopRecording,
    handleUpload,
    resetUpload,
    handleDeleteVideo,
    formatDuration,
  } = useFutureSelf();

  // Seed recordedUri from params when mode=preview
  useEffect(() => {
    if (params.uri && !recordedUri) {
      setRecordedUri(params.uri);
    }
  }, [params.uri]);

  // Request permissions on mount
  useEffect(() => {
    if (cameraPermission && microphonePermission) {
      if (!cameraPermission.granted || !microphonePermission.granted) {
        if (!cameraPermission.granted) requestCameraPermission();
        if (!microphonePermission.granted) requestMicrophonePermission();
      }
    }
  }, [cameraPermission, microphonePermission]);

  // Reset camera ready state on view mode change
  useEffect(() => {
    if (viewMode !== 'camera') setCameraReady(false);
  }, [viewMode]);

  // Present / dismiss the camera sheet
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

  // Present / dismiss the preview sheet
  useEffect(() => {
    if (viewMode === 'preview' && recordedUri) {
      const timer = setTimeout(() => previewSheetRef.current?.present(), 300);
      return () => clearTimeout(timer);
    } else {
      previewSheetRef.current?.dismiss();
    }
  }, [viewMode, recordedUri]);

  // Reset video status when player opens
  useEffect(() => {
    if (viewMode === 'player' && selectedVideo) {
      setVideoLoading(true);
      setVideoError(false);
    }
  }, [viewMode, selectedVideo?._id]);

  // ── Handlers ──────────────────────────────────────────────

  const handleBack = () => {
    if (viewMode === 'player') {
      videoRef.current?.pauseAsync();
    }
    // Just navigate back – the screen unmount will clean up all sheets
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleRequestPermissions = async () => {
    if (!cameraPermission?.granted) await requestCameraPermission();
    if (!microphonePermission?.granted) await requestMicrophonePermission();
  };

  const handleRetake = () => {
    previewSheetRef.current?.dismiss();
    setRecordedUri(null);
    setTimeout(() => setViewMode('camera'), 300);
  };

  const handleUseVideo = () => {
    previewSheetRef.current?.dismiss();
    setTimeout(() => {
      if (!recordedUri) return;
      handleUpload(recordedUri, () => uploadProgressSheetRef.current?.present());
    }, 350);
  };

  const handleUploadDone = () => {
    uploadProgressSheetRef.current?.dismiss();
    resetUpload();
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleCancelUpload = () => {
    uploadProgressSheetRef.current?.dismiss();
    resetUpload();
  };

  // ── Guards ─────────────────────────────────────────────────

  // Permission loading
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
      <PermissionDeniedView
        onGrantPermissions={handleRequestPermissions}
        onBack={handleBack}
      />
    );
  }

  // Video Player
  if (viewMode === 'player' && selectedVideo) {
    return (
      <VideoPlayerView
        video={selectedVideo}
        videoRef={videoRef}
        videoLoading={videoLoading}
        videoError={videoError}
        videoStatus={videoStatus}
        deletingId={deletingId}
        onBack={handleBack}
        onDelete={handleDeleteVideo}
        onLoadStart={() => { setVideoLoading(true); setVideoError(false); }}
        onLoad={status => { setVideoStatus(status); setVideoLoading(false); setVideoError(false); }}
        onError={error => { setVideoLoading(false); setVideoError(true); }}
        onPlaybackStatusUpdate={setVideoStatus}
        onRetry={() => {
          setVideoError(false);
          setVideoLoading(true);
          videoRef.current?.loadAsync({ uri: selectedVideo.videoUrl });
        }}
      />
    );
  }

  // Camera View
  if (viewMode === 'camera') {
    return (
      <CameraSheet
        sheetRef={cameraSheetRef}
        cameraRef={cameraRef}
        cameraFacing={cameraFacing}
        isRecording={isRecording}
        processing={processing}
        cameraSheetPresented={cameraSheetPresented}
        recordingDuration={recordingDuration}
        pulseAnim={pulseAnim}
        onCameraReady={() => setCameraReady(true)}
        onMountError={error => {
          setCameraReady(false);
          Alert.alert('Camera Error', 'Failed to initialize camera. Please try again.');
        }}
        onDismiss={() => {
          // Cleanup only – never navigate from onDismiss (it fires on unmount too)
          setCameraSheetPresented(false);
        }}
        onToggleCamera={toggleCamera}
        onClose={handleBack}
        onStartRecording={() =>
          handleStartRecording(
            !!cameraPermission?.granted,
            !!microphonePermission?.granted,
            requestCameraPermission,
            requestMicrophonePermission,
            () => setViewMode('preview'),
          )
        }
        onStopRecording={handleStopRecording}
        formatDuration={formatDuration}
      />
    );
  }

  // Preview View
  if (viewMode === 'preview' && recordedUri) {
    return (
      <>
        <PreviewSheet
          sheetRef={previewSheetRef}
          recordedUri={recordedUri}
          uploading={uploading}
          insetBottom={insets.bottom}
          onDismiss={() => {
            // Cleanup only – never navigate from onDismiss (it fires on unmount too)
          }}
          onBack={handleBack}
          onRetake={handleRetake}
          onUseVideo={handleUseVideo}
        />

        <UploadProgressSheet
          sheetRef={uploadProgressSheetRef}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadComplete={uploadComplete}
          onDone={handleUploadDone}
          onCancel={handleCancelUpload}
        />
      </>
    );
  }

  // Fallback
  return (
    <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
      <Loader />
    </SafeAreaView>
  );
}