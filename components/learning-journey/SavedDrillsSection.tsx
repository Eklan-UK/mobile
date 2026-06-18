import { PlanDrillRow } from '@/components/learning-journey/PlanDrillRow';
import { PlanFreeTalkRow } from '@/components/learning-journey/PlanFreeTalkRow';
import { AppText, BoldText } from '@/components/ui';
import {
  getBookmarkedPlanItems,
  isFreeTalkPlanItem,
} from '@/domain/learning-journey/group-journey-drills';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import type { DrillAssignment } from '@/types/drill.types';
import { resolveFreeTalkScenarioId } from '@/utils/drillAssignment';
import { navigatePlanDrillRow, navigatePlanFreeTalkRow } from '@/utils/planRowNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

export type SavedDrillsSectionProps = {
  id?: string;
  title?: string;
  defaultExpanded?: boolean;
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

  const handleDrillPress = useCallback((item: DrillAssignment) => {
    navigatePlanDrillRow(item);
  }, []);

  const handleFreeTalkPress = useCallback((item: DrillAssignment) => {
    navigatePlanFreeTalkRow(item, false);
  }, []);

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
        <View nativeID={`${id}-panel`} style={tw`mt-3 gap-3`}>
          {isLoading ? (
            <View style={tw`py-8 items-center`}>
              <ActivityIndicator size="large" color="#22c55e" />
            </View>
          ) : count === 0 ? (
            <View
              style={[
                tw`rounded-2xl p-6 border items-center`,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <Ionicons name="book-outline" size={32} color={c.textLight} />
              <AppText
                style={[tw`text-sm text-center mt-3`, { color: c.textSecondary }]}
              >
                Bookmark drills from your learning journey to find them here.
              </AppText>
            </View>
          ) : (
            bookmarked.map((item) =>
              isFreeTalkPlanItem(item) ? (
                <PlanFreeTalkRow
                  key={item.assignmentId}
                  scenarioId={resolveFreeTalkScenarioId(item.drill, item.assignmentId)}
                  title={item.drill.title}
                  scenarioType={item.drill.scenarioType ?? ''}
                  completionDate={item.drill.completionDate ?? item.dueDate}
                  completedAt={item.completedAt}
                  onPress={() => handleFreeTalkPress(item)}
                />
              ) : (
                <PlanDrillRow
                  key={item.assignmentId}
                  drill={item.drill}
                  assignmentId={item.assignmentId}
                  dueDate={item.dueDate}
                  completedAt={item.completedAt}
                  status={item.status}
                  hasBookmarks={item.hasBookmarks}
                  showBookmark
                  onPress={() => handleDrillPress(item)}
                />
              )
            )
          )}
        </View>
      ) : null}
    </View>
  );
}
