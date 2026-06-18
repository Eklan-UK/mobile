import { FreeTalkDueBadge } from '@/components/practice/FreeTalkDueBadge';
import { AppText } from '@/components/ui';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { freeTalkScenarioTypeLabel } from '@/types/free-talk';
import { isFreeTalkScenarioDueSoon } from '@/utils/freeTalkScenarioCompletion';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

export type PlanFreeTalkRowProps = {
  scenarioId: string;
  title: string;
  scenarioType: string;
  completionDate?: string | Date | null;
  completedAt?: string | Date | null;
  locked?: boolean;
  onPress: () => void;
};

export const PlanFreeTalkRow = memo(function PlanFreeTalkRow({
  title,
  scenarioType,
  completionDate,
  completedAt,
  locked = false,
  onPress,
}: PlanFreeTalkRowProps) {
  const { colors: c } = useSemanticTheme();
  const completed = completedAt != null && completedAt !== '';
  const showDue = isFreeTalkScenarioDueSoon(completionDate ?? null, completed);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        tw`rounded-2xl flex-row items-center p-3 border`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
          opacity: locked ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#A7F3D0', '#5EEAD4']}
        style={tw`w-14 h-14 rounded-xl items-center justify-center`}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#065F46" />
      </LinearGradient>

      <View style={tw`flex-1 ml-3`}>
        <AppText
          style={[tw`text-sm font-semibold`, { color: c.textPrimary }]}
          numberOfLines={2}
        >
          {title}
        </AppText>
        <AppText style={tw`text-xs text-emerald-600 dark:text-emerald-400 mt-1`}>
          • {freeTalkScenarioTypeLabel(scenarioType)}
        </AppText>
        <View style={tw`flex-row flex-wrap items-center gap-2 mt-1`}>
          <View style={tw`flex-row items-center gap-1`}>
            <Ionicons name="time-outline" size={14} color={c.textLight} />
            <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
              5–15 minutes
            </AppText>
          </View>
          {showDue && completionDate ? (
            <FreeTalkDueBadge
              completionDate={
                completionDate instanceof Date
                  ? completionDate.toISOString()
                  : completionDate
              }
              compact
            />
          ) : null}
        </View>
      </View>

      <View style={tw`flex-row items-center gap-1 ml-2`}>
        {completed ? (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#22c55e"
            accessibilityLabel="Completed"
          />
        ) : null}
        {locked ? (
          <View style={tw`flex-row items-center gap-1 bg-green-600 px-2 py-0.5 rounded-full`}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
            <AppText style={tw`text-[10px] font-bold text-white`}>Pro</AppText>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={c.textLight} />
        )}
      </View>
    </TouchableOpacity>
  );
});
