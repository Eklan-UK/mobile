import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import { Modal, View } from 'react-native';
import LogoIcon from '@/assets/icons/logo.svg';

interface JoiningSessionModalProps {
  visible: boolean;
}

export default function JoiningSessionModal({ visible }: JoiningSessionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={tw`flex-1 bg-white items-center justify-center px-8`}>
        <LogoIcon width={83} height={83} style={tw`mb-6`} />
        <BoldText style={tw`text-[#1B1B1B] text-2xl font-bold text-center mb-3`}>
          Joining class...
        </BoldText>
        <AppText style={tw`text-[#8E8E8E] text-base text-center`}>
          Please wait while we connect you to the session.
        </AppText>
      </View>
    </Modal>
  );
}
