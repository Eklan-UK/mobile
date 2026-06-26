import { AppText, BoldText } from '@/components/ui';
import { getLearningJourneyPart, type LearningJourneyPartId } from '@/domain/learning-journey/learning-journey.catalog';
import { useTranslation } from '@/contexts/LanguageContext';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

export type LearningJourneyPartCardProps = {
  part: LearningJourneyPartId;
  completedCount: number;
  totalCount: number;
  onPress: () => void;
};

export const LearningJourneyPartCard = memo(function LearningJourneyPartCard({
  part,
  completedCount,
  totalCount,
  onPress,
}: LearningJourneyPartCardProps) {
  const { t } = useTranslation();
  const { colors: c, isDark } = useSemanticTheme();
  const partDef = getLearningJourneyPart(part);
  const title = partDef?.title ?? '';
  const progressText =
    totalCount > 0
      ? t('journey.progress', { completed: completedCount, total: totalCount })
      : t('journey.noDrillsAssigned');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        tw`rounded-2xl flex-row items-center p-4 border mb-3`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${t('journey.mission', { part })}, ${title}, ${progressText}`}
    >
      <LinearGradient
        colors={
          isDark
            ? ['rgba(6, 78, 59, 0.4)', 'rgba(19, 78, 74, 0.4)']
            : ['#D1FAE5', '#99F6E4']
        }
        style={tw`w-12 h-12 rounded-xl items-center justify-center`}
      >
        <BoldText style={tw`text-lg text-emerald-800 dark:text-emerald-200`}>
          {part}
        </BoldText>
      </LinearGradient>

      <View style={tw`flex-1 ml-3`}>
        <AppText style={[tw`text-xs font-semibold uppercase`, { color: c.textSecondary }]}>
          {t('journey.mission', { part })}
        </AppText>
        <BoldText
          style={[tw`text-sm font-semibold mt-0.5`, { color: c.textPrimary }]}
          numberOfLines={2}
        >
          {title}
        </BoldText>
        <AppText style={[tw`text-xs mt-1`, { color: c.textSecondary }]}>
          {progressText}
        </AppText>
      </View>

      <Ionicons name="chevron-forward" size={20} color={c.textLight} />
    </TouchableOpacity>
  );
});
