import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ResizeMode, Video } from 'expo-av';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PreviewSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  recordedUri: string;
  uploading: boolean;
  insetBottom: number;
  onDismiss: () => void;
  onBack: () => void;
  onRetake: () => void;
  onUseVideo: () => void;
}

/**
 * Bottom sheet showing a preview of the recorded or selected video,
 * with Retake and Use actions.
 */
export function PreviewSheet({
  sheetRef,
  recordedUri,
  uploading,
  insetBottom,
  onDismiss,
  onBack,
  onRetake,
  onUseVideo,
}: PreviewSheetProps) {
  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={[]}>
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={[SCREEN_HEIGHT]}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={false}
        handleIndicatorStyle={{ display: 'none' }}
        backgroundStyle={{ backgroundColor: 'black' }}
        backdropComponent={props => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={1} />
        )}
        onDismiss={onDismiss}
      >
        <BottomSheetView style={{ flex: 1, height: SCREEN_HEIGHT, backgroundColor: 'black' }}>
          {/* Header */}
          <View style={tw`pt-12 pb-6 px-6`}>
            <View style={tw`flex-row justify-between items-center`}>
              <AppText style={tw`text-white text-xl font-bold`}>Video recording</AppText>
              <TouchableOpacity onPress={onBack} style={tw`p-2`} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Video Preview */}
          <View style={tw`flex-1 items-center justify-center px-6`}>
            <View
              style={[
                tw`w-full rounded-3xl overflow-hidden`,
                { aspectRatio: 9 / 16, maxHeight: SCREEN_HEIGHT * 0.7 },
              ]}
            >
              <Video
                source={{ uri: recordedUri }}
                style={tw`w-full h-full`}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping={false}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={[tw`px-6 pt-6`, { paddingBottom: Math.max(insetBottom, 12) + 12 }]}>
            <View style={tw`flex-row justify-between items-center`}>
              <TouchableOpacity onPress={onRetake} activeOpacity={0.7}>
                <AppText style={tw`text-white text-lg font-medium`}>Retake video</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={onUseVideo} activeOpacity={0.7} disabled={uploading}>
                <AppText style={[tw`text-lg font-semibold`, { color: '#FFA500' }]}>
                  Use this video
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
