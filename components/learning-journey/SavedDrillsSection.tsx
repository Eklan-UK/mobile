import { SavedDrillsList } from '@/components/learning-journey/SavedDrillsList';
import { AppText, BoldText } from '@/components/ui';
import { getBookmarkedPlanItems } from '@/domain/learning-journey/group-journey-drills';
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

function subtitleForCount(count: number, isLoading: boolean): string {
  if (isLoading) return 'Loading…';
  if (count === 0) return 'No saved drills yet';
  if (count === 1) return '1 saved drill';
  return `${count} saved drills`;
}

export function SavedDrillsSection({
  id = 'saved-drills',
  title = 'Saved Drills',
  defaultExpanded = false,
  showTopicTitle = false,
}: SavedDrillsSectionProps) {
  const { colors: c, isDark } = useSemanticTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { data, isLoading } = useLearnerDrills();

  const bookmarked = useMemo(
    () => getBookmarkedPlanItems(data?.drills ?? []),
    [data?.drills]
  );
  const count = bookmarked.length;
  const subtitle = subtitleForCount(count, isLoading);
  const showBadge = !isLoading && count > 0;

  return (
    <View nativeID={id}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={[
          tw`rounded-2xl p-4 border flex-row items-center`,
          {
            backgroundColor: c.card,
            borderColor: c.border,
            boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View
          style={[
            tw`w-10 h-10 rounded-xl items-center justify-center`,
            { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5' },
          ]}
        >
          <Ionicons
            name="bookmark"
            size={20}
            color={isDark ? '#FB923C' : '#EA580C'}
          />
        </View>

        <View style={tw`flex-1 ml-3`}>
          <BoldText style={[tw`text-base`, { color: c.textPrimary }]}>{title}</BoldText>
          <AppText style={[tw`text-xs mt-0.5`, { color: c.textSecondary }]}>{subtitle}</AppText>
        </View>

        {showBadge ? (
          <View
            style={[
              tw`min-w-6 h-6 px-2 rounded-full items-center justify-center mr-2`,
              { backgroundColor: c.muted },
            ]}
          >
            <AppText style={[tw`text-xs font-semibold`, { color: c.textSecondary }]}>
              {count}
            </AppText>
          </View>
        ) : null}

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={c.textLight}
        />
      </TouchableOpacity>

      {expanded ? (
        <View nativeID={`${id}-panel`} style={tw`mt-3`}>
          <SavedDrillsList showTopicTitle={showTopicTitle} />
        </View>
      ) : null}
    </View>
  );
}
