import { FreeTalkDueBadge } from '@/components/practice/FreeTalkDueBadge';
import { AppText, BoldText } from '@/components/ui';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { formatScenarioType, type FreeTalkScenarioSummary } from '@/types/free-talk';
import { shouldShowFreeTalkDueIndicator } from '@/utils/freeTalkScenarioCompletion';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type HomePalette = {
  isDark: boolean;
  drillCardBg: string;
  drillCardBorder: string;
  drillTitle: string;
  drillMeta: string;
  drillAssignedBy: string;
};

type Props = {
  scenario: FreeTalkScenarioSummary;
  onPress: () => void;
  palette: HomePalette;
  completed?: boolean;
};

export const AssignedFreeTalkHomeCard = memo(function AssignedFreeTalkHomeCard({
  scenario,
  onPress,
  palette: p,
  completed = false,
}: Props) {
  const isSubscribed = useIsSubscribed();
  const completionDate = scenario.completionDate;
  const showDue = shouldShowFreeTalkDueIndicator(completionDate, completed);
  const assignedByName = scenario.assignedBy
    ? `${scenario.assignedBy.firstName ?? ''} ${scenario.assignedBy.lastName ?? ''}`.trim()
    : null;
  const assignedDateStr = scenario.assignedAt
    ? format(new Date(scenario.assignedAt), 'MMM d, yyyy')
    : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: p.drillCardBg, borderColor: p.drillCardBorder },
      ]}
    >
      <View style={tw`flex-row items-start gap-3`}>
        <View style={[styles.thumb, { backgroundColor: p.isDark ? '#1A2E1F' : '#EDFAF2' }]}>
          <Ionicons name="chatbubble-ellipses" size={22} color="#4CAF50" />
        </View>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center justify-between gap-2`}>
            <BoldText style={[styles.title, { color: p.drillTitle }]} numberOfLines={2}>
              {scenario.title}
            </BoldText>
            {showDue && completionDate ? (
              <FreeTalkDueBadge completionDate={completionDate} />
            ) : (
              <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                <AppText style={[styles.badgeText, { color: '#1E40AF' }]}>Active</AppText>
              </View>
            )}
          </View>
          <View style={tw`flex-row items-center gap-1 mt-1`}>
            <AppText style={[styles.meta, { color: p.drillMeta }]}>Free Talk</AppText>
            <AppText style={styles.metaDot}>•</AppText>
            <AppText style={[styles.meta, { color: p.drillMeta }]}>
              {formatScenarioType(scenario.scenarioType)}
            </AppText>
          </View>
        </View>
      </View>

      {assignedDateStr ? (
        <View style={tw`flex-row items-center gap-1 mt-2`}>
          <Ionicons name="calendar-outline" size={13} color={p.drillMeta} />
          <AppText style={[styles.meta, { color: p.drillMeta }]}>
            Assigned: {assignedDateStr}
          </AppText>
        </View>
      ) : null}

      <View style={tw`flex-row items-center justify-between mt-3`}>
        {assignedByName ? (
          <AppText style={[styles.assignedBy, { color: p.drillAssignedBy }]} numberOfLines={1}>
            Assigned by: {assignedByName}
          </AppText>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={[styles.cta, !isSubscribed && styles.ctaLocked]}
          onPress={() => {
            if (!isSubscribed) {
              router.push('/premium');
              return;
            }
            onPress();
          }}
          activeOpacity={0.85}
        >
          {!isSubscribed ? (
            <View style={tw`flex-row items-center gap-1`}>
              <Ionicons name="lock-closed" size={12} color="#fff" />
              <BoldText style={styles.ctaText}>Pro</BoldText>
            </View>
          ) : (
            <BoldText style={styles.ctaText}>Start</BoldText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

/** Plan tab card — matches `components/practice/DrillCard` layout. */
export function AssignedFreeTalkPlanCard({
  scenario,
  onPress,
  completed = false,
}: {
  scenario: FreeTalkScenarioSummary;
  onPress: () => void;
  completed?: boolean;
}) {
  const { colors: c } = useSemanticTheme();
  const completionDate = scenario.completionDate;
  const showDue = shouldShowFreeTalkDueIndicator(completionDate, completed);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        tw`rounded-2xl mb-3 flex-row items-center p-3`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
        },
      ]}
      activeOpacity={0.7}
    >
      <View
        style={[
          tw`w-16 h-16 rounded-xl items-center justify-center mr-3`,
          { backgroundColor: c.muted },
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#4CAF50" />
      </View>
      <View style={tw`flex-1`}>
        <AppText style={[tw`text-base font-semibold mb-1`, { color: c.textPrimary }]}>
          {scenario.title}
        </AppText>
        <View style={tw`flex-row items-center gap-2`}>
          <View style={tw`flex-row items-center gap-1`}>
            <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: '#4CAF50' }]} />
            <AppText style={[tw`text-sm font-medium`, { color: '#4CAF50' }]}>
              Free Talk
            </AppText>
          </View>
          <AppText style={[tw`text-sm`, { color: c.textSecondary }]}>
            {formatScenarioType(scenario.scenarioType)}
          </AppText>
        </View>
        <View style={tw`flex-row flex-wrap items-center gap-x-2 gap-y-1 mt-1`}>
          <View style={tw`flex-row items-center gap-1`}>
            <Ionicons name="time-outline" size={14} color={c.textLight} />
            <AppText style={[tw`text-sm`, { color: c.textSecondary }]}>5–10 mins</AppText>
          </View>
          {showDue && completionDate ? (
            <FreeTalkDueBadge completionDate={completionDate} compact />
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 16,
    padding: 14,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaDot: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  assignedBy: {
    flex: 1,
    fontSize: 12,
    marginRight: 8,
  },
  cta: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ctaLocked: {
    backgroundColor: '#16a34a',
  },
  ctaText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
});
