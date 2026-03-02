import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { formatTimeAgo } from '@/utils/date';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

interface VideoPlayerViewProps {
  video: FutureSelfVideo;
  videoRef: React.RefObject<Video | null>;
  videoLoading: boolean;
  videoError: boolean;
  videoStatus: any;
  deletingId: string | null;
  onBack: () => void;
  onDelete: (videoId: string) => void;
  onLoadStart: () => void;
  onLoad: (status: any) => void;
  onError: (error: any) => void;
  onPlaybackStatusUpdate: (status: any) => void;
  onRetry: () => void;
}

/**
 * Full-screen video player for viewing a recorded Future Self video.
 * Stateless – all UI state is managed by the parent screen.
 */
export function VideoPlayerView({
  video,
  videoRef,
  videoLoading,
  videoError,
  videoStatus,
  deletingId,
  onBack,
  onDelete,
  onLoadStart,
  onLoad,
  onError,
  onPlaybackStatusUpdate,
  onRetry,
}: VideoPlayerViewProps) {
  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={[]}>
      <View style={tw`flex-1 bg-black`}>
        <View style={tw`flex-1 relative`}>
          <Video
            ref={videoRef}
            source={{ uri: video.videoUrl }}
            style={tw`flex-1 bg-black`}
            useNativeControls={!videoLoading}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            onLoadStart={onLoadStart}
            onLoad={onLoad}
            onError={onError}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />

          {/* Loading overlay */}
          {videoLoading && (
            <View style={tw`absolute inset-0 bg-black items-center justify-center`}>
              <ActivityIndicator size="large" color="#fff" />
              <AppText style={tw`text-white text-base font-medium mt-4`}>Loading video...</AppText>
            </View>
          )}

          {/* Error overlay */}
          {videoError && (
            <View style={tw`absolute inset-0 bg-black items-center justify-center px-6`}>
              <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
              <AppText style={tw`text-white text-lg font-semibold mt-4 mb-2 text-center`}>
                Failed to load video
              </AppText>
              <AppText style={tw`text-gray-400 text-sm text-center mb-6`}>
                Please check your connection and try again
              </AppText>
              <TouchableOpacity onPress={onRetry} style={tw`bg-white rounded-full px-6 py-3`}>
                <AppText style={tw`text-black font-semibold`}>Retry</AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* Top controls */}
          <View style={tw`absolute top-0 left-0 right-0 pt-12 pb-4 px-6`}>
            <View style={tw`flex-row justify-between items-center`}>
              <TouchableOpacity
                onPress={onBack}
                style={tw`w-10 h-10 rounded-full bg-black/60 items-center justify-center`}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={tw`flex-row items-center gap-3`}>
                {video.createdAt && (
                  <View style={tw`bg-black/60 px-3 py-1.5 rounded-full`}>
                    <AppText style={tw`text-white text-xs font-medium`}>
                      {formatTimeAgo(video.createdAt)}
                    </AppText>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => onDelete(video._id)}
                  style={tw`w-10 h-10 rounded-full bg-black/60 items-center justify-center`}
                  activeOpacity={0.7}
                  disabled={deletingId === video._id}
                >
                  {deletingId === video._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bottom info */}
          {!videoLoading && !videoError && videoStatus && (
            <View style={tw`absolute bottom-0 left-0 right-0 pb-8 px-6`}>
              <View style={tw`bg-black/60 rounded-2xl p-4`}>
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
                {video.description && (
                  <AppText style={tw`text-gray-300 text-sm`} numberOfLines={2}>
                    {video.description}
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
