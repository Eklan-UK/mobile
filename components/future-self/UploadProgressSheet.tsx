import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

interface UploadProgressSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  uploading: boolean;
  uploadProgress: number;
  uploadComplete: boolean;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Bottom sheet showing the real-time upload progress bar and a completion CTA.
 */
export function UploadProgressSheet({
  sheetRef,
  uploading,
  uploadProgress,
  uploadComplete,
  onDone,
  onCancel,
}: UploadProgressSheetProps) {
  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['50%']}
      enablePanDownToClose={false}
      backdropComponent={props => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
    >
      <BottomSheetView style={tw`px-6 pb-6 flex-1`}>
        {/* Close button */}
        <View style={tw`items-end mb-4`}>
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            style={tw`p-2`}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <AppText style={tw`text-2xl font-bold text-gray-900 mb-2`}>
          This is your starting point.
        </AppText>
        <AppText style={tw`text-base text-gray-700 mb-6`}>
          We'll use this video to help track your confidence and fluency over time.
        </AppText>

        {/* File row & progress bar */}
        <View style={tw`flex-row items-center bg-gray-50 rounded-2xl p-4 mb-6`}>
          <View
            style={[
              tw`w-14 h-14 rounded-xl items-center justify-center mr-4`,
              { backgroundColor: uploadComplete ? '#34C759' : '#9CA3AF' },
            ]}
          >
            <Ionicons
              name={uploadComplete ? 'checkmark' : 'videocam'}
              size={28}
              color="#fff"
            />
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
              <View style={tw`h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                <View
                  style={[
                    tw`h-full rounded-full`,
                    {
                      width: `${Math.round(uploadProgress)}%`,
                      backgroundColor: '#34C759',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Side indicator */}
          {!uploadComplete && uploading && (
            <View style={tw`p-2`}>
              <ActivityIndicator size="small" color="#34C759" />
            </View>
          )}
          {!uploadComplete && !uploading && (
            <TouchableOpacity style={tw`p-2`} activeOpacity={0.7} onPress={onCancel}>
              <Ionicons name="trash-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Percentage */}
        <View style={tw`items-end mb-6`}>
          <AppText style={tw`text-sm font-semibold text-gray-900`}>
            {Math.round(uploadProgress)}%
          </AppText>
        </View>

        {/* Done button */}
        <TouchableOpacity
          onPress={uploadComplete ? onDone : undefined}
          style={[
            tw`rounded-full py-4 items-center`,
            { backgroundColor: '#34C759', opacity: uploadComplete ? 1 : 0.5 },
          ]}
          activeOpacity={0.8}
          disabled={!uploadComplete}
        >
          <AppText style={tw`text-white font-semibold text-lg`}>Alright, all good 👍</AppText>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
