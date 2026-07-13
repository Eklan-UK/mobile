import { PlanDrillRow } from '@/components/learning-journey/PlanDrillRow';
import { PlanFreeTalkRow } from '@/components/learning-journey/PlanFreeTalkRow';
import { AppText } from '@/components/ui';
import {
  getBookmarkedPlanItems,
  isFreeTalkPlanItem,
} from '@/domain/learning-journey/group-journey-drills';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import type { DrillAssignment } from '@/types/drill.types';
import { resolveDrillTopicTitle, resolveFreeTalkScenarioId } from '@/utils/drillAssignment';
import { navigatePlanDrillRow, navigatePlanFreeTalkRow } from '@/utils/planRowNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

export type SavedDrillsListProps = {
  /** When true, show server topicTitle above drill titles (Home only). */
  showTopicTitle?: boolean;
};

export function SavedDrillsList({ showTopicTitle = false }: SavedDrillsListProps) {
  const { colors: c } = useSemanticTheme();
  const { data, isLoading } = useLearnerDrills();

  const bookmarked = useMemo(
    () => getBookmarkedPlanItems(data?.drills ?? []),
    [data?.drills]
  );

  const handleDrillPress = useCallback((item: DrillAssignment) => {
    navigatePlanDrillRow(item);
  }, []);

  const handleFreeTalkPress = useCallback((item: DrillAssignment) => {
    navigatePlanFreeTalkRow(item, false);
  }, []);

  if (isLoading) {
    return (
      <View style={tw`py-8 items-center`}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (bookmarked.length === 0) {
    return (
      <View
        style={[
          tw`rounded-2xl p-6 border items-center`,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <Ionicons name="book-outline" size={32} color={c.textLight} />
        <AppText style={[tw`text-sm text-center mt-3`, { color: c.textSecondary }]}>
          Bookmark drills from your learning journey to find them here.
        </AppText>
      </View>
    );
  }

  return (
    <View style={tw`gap-3`}>
      {bookmarked.map((item) =>
        isFreeTalkPlanItem(item) ? (
          <PlanFreeTalkRow
            key={item.assignmentId}
            scenarioId={resolveFreeTalkScenarioId(item.drill, item.assignmentId)}
            title={item.drill.title}
            scenarioType={item.drill.scenarioType ?? ''}
            topicTitle={showTopicTitle ? resolveDrillTopicTitle(item.drill) : null}
            completionDate={item.drill.completionDate ?? item.dueDate}
            completedAt={item.completedAt}
            onPress={() => handleFreeTalkPress(item)}
          />
        ) : (
          <PlanDrillRow
            key={item.assignmentId}
            drill={item.drill}
            topicTitle={showTopicTitle ? resolveDrillTopicTitle(item.drill) : null}
            assignmentId={item.assignmentId}
            dueDate={item.dueDate}
            completedAt={item.completedAt}
            status={item.status}
            hasBookmarks={item.hasBookmarks}
            showBookmark
            onPress={() => handleDrillPress(item)}
          />
        )
      )}
    </View>
  );
}
