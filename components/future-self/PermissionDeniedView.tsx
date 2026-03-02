import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PermissionDeniedViewProps {
  onGrantPermissions: () => void;
  onBack: () => void;
}

/**
 * Renders a full-screen UI when camera/microphone permissions have not been granted.
 */
export function PermissionDeniedView({ onGrantPermissions, onBack }: PermissionDeniedViewProps) {
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
          onPress={onGrantPermissions}
          style={[tw`w-full py-4 rounded-full items-center mb-3`, { backgroundColor: '#007AFF' }]}
          activeOpacity={0.7}
        >
          <AppText style={tw`text-white font-semibold`}>Grant Permissions</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onBack}
          style={[tw`w-full py-4 rounded-full items-center border-2 border-white`]}
          activeOpacity={0.7}
        >
          <AppText style={tw`text-white font-semibold`}>Back</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
