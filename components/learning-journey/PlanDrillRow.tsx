import { DrillBookmarkToggle } from '@/components/practice/DrillBookmarkToggle';
import { AppText } from '@/components/ui';
import { getPlanDrillStatus } from '@/domain/learning-journey/group-journey-drills';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { Drill, DrillType, getDrillCategory } from '@/types/drill.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

const DRILL_EMOJI: Record<DrillType, string> = {
  roleplay: '🎭',
  vocabulary: '📚',
  grammar: '✏️',
  listening: '🎧',
  summary: '📰',
  matching: '🔗',
  definition: '📖',
  sentence_writing: '✍️',
  sentence: '💬',
  fill_blank: '📝',
  pronunciation: '🗣️',
  key_phrases: '🗝️',
  eklan_free_talk: '💬',
};

const DRILL_GRADIENT: Record<DrillType, [string, string]> = {
  roleplay: ['#DBEAFE', '#BFDBFE'],
  vocabulary: ['#FFEDD5', '#FED7AA'],
  grammar: ['#FCE7F3', '#FBCFE8'],
  listening: ['#CFFAFE', '#A5F3FC'],
  summary: ['#DCFCE7', '#BBF7D0'],
  matching: ['#FFEDD5', '#FED7AA'],
  definition: ['#EDE9FE', '#DDD6FE'],
  sentence_writing: ['#EDE9FE', '#DDD6FE'],
  sentence: ['#EDE9FE', '#DDD6FE'],
  fill_blank: ['#CFFAFE', '#A5F3FC'],
  pronunciation: ['#E0F2FE', '#BAE6FD'],
  key_phrases: ['#FEF3C7', '#FDE68A'],
  eklan_free_talk: ['#D1FAE5', '#99F6E4'],
};

const TYPE_COLORS: Record<string, string> = {
  Vocabulary: '#f59e0b',
  Scenario: '#3b82f6',
  Matching: '#8b5cf6',
  Listening: '#06b6d4',
  Reading: '#34C759',
  Grammar: '#ec4899',
  Writing: '#10b981',
  Sentence: '#f59e0b',
  Definition: '#6155F5',
  Pronunciation: '#6155F5',
  'Key Phrases': '#D97706',
  'Fill in the Blank': '#06b6d4',
};

export type PlanDrillRowProps = {
  drill: Pick<Drill, '_id' | 'title' | 'type' | 'date'>;
  assignmentId?: string;
  dueDate?: string;
  completedAt?: string;
  status?: string;
  hasBookmarks?: boolean;
  showBookmark?: boolean;
  onPress: () => void;
  onPressIn?: () => void;
};

function DrillThumb({ type }: { type: DrillType }) {
  const colors = DRILL_GRADIENT[type] ?? ['#F3F4F6', '#E5E7EB'];
  return (
    <LinearGradient
      colors={colors}
      style={tw`w-14 h-14 rounded-xl items-center justify-center`}
    >
      {type === 'pronunciation' ? (
        <Ionicons name="mic" size={24} color="#38BDF8" />
      ) : (
        <AppText style={tw`text-xl`}>{DRILL_EMOJI[type] ?? '📝'}</AppText>
      )}
    </LinearGradient>
  );
}

export const PlanDrillRow = memo(function PlanDrillRow({
  drill,
  assignmentId: _assignmentId,
  dueDate,
  completedAt,
  status,
  hasBookmarks = false,
  showBookmark = false,
  onPress,
  onPressIn,
}: PlanDrillRowProps) {
  const { colors: c } = useSemanticTheme();
  const category = getDrillCategory(drill.type);
  const categoryColor = TYPE_COLORS[category] ?? c.textSecondary;
  const planStatus = getPlanDrillStatus({
    drill: drill as Drill,
    assignmentId: '',
    assignedBy: '',
    assignedAt: '',
    status: (status as 'pending' | 'in_progress' | 'completed') ?? 'pending',
    completedAt,
    dueDate,
  });
  const isInProgress =
    planStatus === 'in-progress' ||
    (typeof status === 'string' &&
      status.trim().toLowerCase().replace(/-/g, '_') === 'in_progress' &&
      planStatus !== 'completed');
  const isCompleted = planStatus === 'completed';

  return (
    <View
      style={[
        tw`rounded-2xl flex-row items-center p-3 border`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
        },
      ]}
    >
      <TouchableOpacity
        style={tw`flex-1 flex-row items-center`}
        onPress={onPress}
        onPressIn={onPressIn}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <DrillThumb type={drill.type} />
        <View style={tw`flex-1 ml-3`}>
          <AppText
            style={[tw`text-sm font-semibold`, { color: c.textPrimary }]}
            numberOfLines={2}
          >
            {drill.title}
          </AppText>
          <View style={tw`flex-row flex-wrap items-center mt-1`}>
            <AppText style={[tw`text-xs`, { color: categoryColor }]}>
              • {category}
            </AppText>
            {isInProgress ? (
              <AppText style={tw`text-xs text-sky-500 ml-1`}>· In progress</AppText>
            ) : null}
          </View>
          <View style={tw`flex-row items-center gap-1 mt-1`}>
            <Ionicons name="time-outline" size={14} color={c.textLight} />
            <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
              5–15 minutes
            </AppText>
          </View>
        </View>
      </TouchableOpacity>

      <View style={tw`flex-row items-center gap-1 ml-2`}>
        {isCompleted ? (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#22c55e"
            accessibilityLabel="Completed"
          />
        ) : null}
        {showBookmark ? (
          <DrillBookmarkToggle drillId={drill._id} hasBookmarks={hasBookmarks} />
        ) : null}
        <Ionicons name="chevron-forward" size={20} color={c.textLight} />
      </View>
    </View>
  );
});
