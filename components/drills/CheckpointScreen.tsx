import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { router } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

function ProgressRing({
  completed,
  total,
  size = 220,
  strokeWidth = 18,
}: {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const gapAngle = 60;
  const visibleArc = 360 - gapAngle;
  const visibleCircumference = (visibleArc / 360) * circumference;
  const gapDashOffset = circumference - visibleCircumference;
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const rotateAngle = 90 + gapAngle / 2;

  return (
    <View style={tw`items-center justify-center`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${visibleCircumference} ${gapDashOffset}`}
          strokeLinecap="round"
          transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3B883E"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress * visibleCircumference} ${circumference - progress * visibleCircumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={tw`absolute items-center justify-center`}>
        <AppText style={tw`text-5xl font-bold text-neutral-900`}>
          {completed}/{total}
        </AppText>
        <AppText style={tw`text-lg text-neutral-500 mt-1`}>Lesson</AppText>
      </View>
    </View>
  );
}

export interface CheckpointScreenProps {
  completedCount: number;
  totalItems: number;
  title?: string;
  onContinue: () => void;
}

export default function CheckpointScreen({
  completedCount,
  totalItems,
  title = 'Progress Saved',
  onContinue,
}: CheckpointScreenProps) {
  const remaining = Math.max(totalItems - completedCount, 0);

  const handleExit = () => {
    router.replace('/(tabs)/plan');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={['top', 'bottom']}>
      <View style={tw`flex-1 px-6 items-center justify-center`}>
        <ProgressRing completed={completedCount} total={totalItems} />

        <View style={tw`items-center mt-8`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-3 text-center`}>
            {title}
          </AppText>
          <AppText style={tw`text-base text-neutral-600 text-center leading-6`}>
            {`You've completed ${completedCount} of ${totalItems} items.`}
          </AppText>
          {remaining > 0 ? (
            <AppText style={tw`text-base text-neutral-600 text-center leading-6 mt-2`}>
              {`${remaining} item${remaining === 1 ? '' : 's'} remaining.`}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={tw`px-6 pb-6 gap-3`}>
        <TouchableOpacity
          onPress={onContinue}
          style={tw`w-full bg-primary-500 rounded-full py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-white text-base font-semibold`}>Continue</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExit}
          style={tw`w-full border-2 border-primary-500 rounded-full py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-primary-500 text-base font-semibold`}>
            Exit & Resume Later
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
