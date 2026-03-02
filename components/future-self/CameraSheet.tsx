import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { CameraView } from 'expo-camera';
import { ActivityIndicator, Animated, Dimensions, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type CameraFacing = 'front' | 'back';

interface CameraSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  cameraRef: React.RefObject<CameraView | null>;
  cameraFacing: CameraFacing;
  isRecording: boolean;
  processing: boolean;
  cameraSheetPresented: boolean;
  recordingDuration: number;
  pulseAnim: Animated.Value;
  onCameraReady: () => void;
  onMountError: (error: any) => void;
  onDismiss: () => void;
  onToggleCamera: () => void;
  onClose: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  formatDuration: (seconds: number) => string;
}

/**
 * Camera recording bottom sheet.
 * Presents a full-screen camera view inside a bottom sheet modal.
 */
export function CameraSheet({
  sheetRef,
  cameraRef,
  cameraFacing,
  isRecording,
  processing,
  cameraSheetPresented,
  recordingDuration,
  pulseAnim,
  onCameraReady,
  onMountError,
  onDismiss,
  onToggleCamera,
  onClose,
  onStartRecording,
  onStopRecording,
  formatDuration,
}: CameraSheetProps) {
  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={[]}>
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={[SCREEN_HEIGHT]}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={false}
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={{ display: 'none' }}
        backgroundStyle={{ backgroundColor: 'black' }}
        backdropComponent={props => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={1} />
        )}
        onDismiss={onDismiss}
      >
        <BottomSheetView style={{ flex: 1, height: SCREEN_HEIGHT, backgroundColor: 'black' }}>
          {cameraSheetPresented ? (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              facing={cameraFacing}
              mode="video"
              videoQuality="480p"
              videoBitrate={2_500_000}
              videoStabilizationMode="off"
              onCameraReady={onCameraReady}
              onMountError={onMountError}
            >
              {/* Top Controls */}
              <View style={tw`pt-12 pb-8 px-6`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <TouchableOpacity onPress={onClose} style={tw`p-2`} activeOpacity={0.7}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                  <View style={tw`flex-1`} />
                  {isRecording && (
                    <View style={tw`bg-red-500/80 px-3 py-1 rounded-full mr-3`}>
                      <AppText style={tw`text-white text-sm font-bold`}>
                        {formatDuration(recordingDuration)}
                      </AppText>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={onToggleCamera}
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
                    <AppText style={tw`text-white text-base font-semibold mt-4`}>Processing...</AppText>
                  </View>
                ) : (
                  <View style={tw`items-center mb-8`}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <TouchableOpacity
                        onPress={isRecording ? onStopRecording : onStartRecording}
                        style={[
                          tw`w-20 h-20 rounded-full items-center justify-center`,
                          {
                            borderWidth: 4,
                            borderColor: '#fff',
                            backgroundColor: isRecording ? '#FF3B30' : 'transparent',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        {!isRecording && <View style={[tw`w-16 h-16 rounded-full`, { backgroundColor: '#fff' }]} />}
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
