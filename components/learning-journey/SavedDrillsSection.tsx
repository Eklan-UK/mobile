import { SavedDrillsList } from '@/components/learning-journey/SavedDrillsList';
import { AppText, BoldText } from '@/components/ui';
import { getBookmarkedPlanItems } from '@/domain/learning-journey/group-journey-drills';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

export type SavedDrillsSectionProps = {
  id?: string;
  title?: string;
  defaultExpanded?: boolean;
  /** When true, show server topicTitle above drill titles (Home only). */
  showTopicTitle?: boolean;
};

export function SavedDrillsSection({
  id = 'saved-drills',
  title,
  defaultExpanded = false,
  showTopicTitle = false,
}: SavedDrillsSectionProps) {
  const { t } = useTranslation();
  const { colors: c, isDark } = useSemanticTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { data, isLoading } = useLearnerDrills();

  const bookmarked = useMemo(
    () => getBookmarkedPlanItems(data?.drills ?? []),
    [data?.drills]
  );
  const count = bookmarked.length;
  const resolvedTitle = title ?? t('account.savedDrills');
  const subtitle = t('account.savedDrillsQuickAccess');
  const pillLabel = isLoading
    ? t('common.loading')
    : t('account.nSaved', { count });

  return (
    <View nativeID={id}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={[
          tw`rounded-2xl p-[17px] border gap-3`,
          {
            backgroundColor: c.card,
            borderColor: isDark ? c.border : 'rgba(224,224,224,0.5)',
            boxShadow: '0px 4px 10px rgba(0,0,0,0.05)',
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={tw`flex-row items-center gap-2`}>
          <Ionicons
            name="bookmark"
            size={16}
            color={isDark ? '#FB923C' : '#EA580C'}
          />
          <BoldText style={[tw`text-sm`, { color: c.textPrimary }]}>
            {resolvedTitle}
          </BoldText>
        </View>

        <AppText style={[tw`text-xs`, { color: c.textPrimary }]}>
          {subtitle}
        </AppText>

        <View style={tw`flex-row items-center justify-between`}>
          <View
            style={[
              tw`px-2 py-0.5 rounded-lg`,
              { backgroundColor: isDark ? c.muted : '#f3f4f6' },
            ]}
          >
            <BoldText style={[tw`text-[11px]`, { color: c.textPrimary }]}>
              {pillLabel}
            </BoldText>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-forward'}
            size={16}
            color={c.textLight}
          />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View nativeID={`${id}-panel`} style={tw`mt-3`}>
          <SavedDrillsList showTopicTitle={showTopicTitle} />
        </View>
      ) : null}
    </View>
  );
}
