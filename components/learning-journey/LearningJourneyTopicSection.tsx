import { PlanDrillRow } from '@/components/learning-journey/PlanDrillRow';
import { PlanFreeTalkRow } from '@/components/learning-journey/PlanFreeTalkRow';
import { AppText, BoldText } from '@/components/ui';
import { isFreeTalkPlanItem } from '@/domain/learning-journey/group-journey-drills';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import type { DrillAssignment } from '@/types/drill.types';
import { resolveFreeTalkScenarioId } from '@/utils/drillAssignment';
import { memo } from 'react';
import { View } from 'react-native';

export type LearningJourneyTopicSectionProps = {
  topicId: string;
  topicTitle: string;
  items: DrillAssignment[];
  onDrillPress: (item: DrillAssignment) => void;
  onFreeTalkPress: (item: DrillAssignment) => void;
  onDrillPressIn?: (item: DrillAssignment) => void;
};

export const LearningJourneyTopicSection = memo(function LearningJourneyTopicSection({
  topicId,
  topicTitle,
  items,
  onDrillPress,
  onFreeTalkPress,
  onDrillPressIn,
}: LearningJourneyTopicSectionProps) {
  const { colors: c } = useSemanticTheme();

  return (
    <View accessibilityRole="none" nativeID={`topic-${topicId}`}>
      <BoldText
        style={[tw`text-base font-bold mb-3`, { color: c.textPrimary }]}
        accessibilityRole="header"
      >
        {topicTitle}
      </BoldText>

      {items.length === 0 ? (
        <View
          style={[
            tw`rounded-2xl p-4 border items-center`,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <AppText style={[tw`text-sm text-center`, { color: c.textSecondary }]}>
            No drills assigned for this topic yet.
          </AppText>
        </View>
      ) : (
        <View style={tw`gap-3`}>
          {items.map((item) =>
            isFreeTalkPlanItem(item) ? (
              <PlanFreeTalkRow
                key={item.assignmentId}
                scenarioId={resolveFreeTalkScenarioId(item.drill, item.assignmentId)}
                title={item.drill.title}
                scenarioType={item.drill.scenarioType ?? ''}
                completionDate={item.drill.completionDate ?? item.dueDate}
                completedAt={item.completedAt}
                onPress={() => onFreeTalkPress(item)}
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
                onPress={() => onDrillPress(item)}
                onPressIn={() => onDrillPressIn?.(item)}
              />
            )
          )}
        </View>
      )}
    </View>
  );
});
