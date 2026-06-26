import { AppText, BoldText, Button } from '@/components/ui';
import tw from '@/lib/tw';
import { View } from 'react-native';

export interface RoleplaySceneBreakPanelProps {
  completedSceneName: string;
  nextSceneName: string;
  saving?: boolean;
  showContinueLater?: boolean;
  bottomInset?: number;
  onContinueNextScene: () => void;
  onContinueLater: () => void;
}

export default function RoleplaySceneBreakPanel({
  completedSceneName,
  nextSceneName,
  saving = false,
  showContinueLater = true,
  bottomInset = 0,
  onContinueNextScene,
  onContinueLater,
}: RoleplaySceneBreakPanelProps) {
  return (
    <View
      style={[
        tw`flex-1 justify-end`,
        { paddingBottom: bottomInset + 16, paddingHorizontal: 16 },
      ]}
    >
      <View
        style={tw`rounded-2xl border border-sky-200 bg-sky-50 px-5 py-6 mb-4`}
      >
        <BoldText style={tw`text-lg text-sky-900 mb-2`}>
          Scene complete: {completedSceneName}
        </BoldText>
        <AppText style={tw`text-sm text-sky-800 leading-5 mb-6`}>
          Great work! Take a breath before the next part of the conversation.
          Up next: {nextSceneName}.
        </AppText>

        <Button onPress={onContinueNextScene} disabled={saving} style={tw`mb-3`}>
          Continue to Next Scene
        </Button>

        {showContinueLater ? (
          <Button
            variant="outline"
            onPress={onContinueLater}
            disabled={saving}
            loading={saving}
          >
            Continue Later
          </Button>
        ) : null}
      </View>
    </View>
  );
}
