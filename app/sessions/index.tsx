import { AppText, BoldText } from '@/components/ui';
import { SessionCard } from '@/components/sessions/SessionCard';
import RescheduleModal from '@/components/sessions/RescheduleModal';
import JoiningSessionModal from '@/components/sessions/JoiningSessionModal';
import { RescheduleSuccessToast } from '@/components/sessions/RescheduleSuccessToast';
import {
  useLearnerClassesByBucket,
  useLearnerPastSessions,
} from '@/hooks/useLearnerClasses';
import tw from '@/lib/tw';
import { LearnerClassListItem, PastSession } from '@/types/session.types';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'thisWeek' | 'upcoming' | 'past';

interface RescheduleTarget {
  sessionId: string;
  tutorName: string;
  startUtc: string;
  endUtc: string;
}

// ─── Tab pill button ──────────────────────────────────────────────────────────

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        tw`flex-1 py-3 rounded-full items-center justify-center`,
        active
          ? tw`bg-[#3B883E] border border-[rgba(158,167,183,0.22)]`
          : tw`bg-white`,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <AppText
        style={[
          tw`text-xs`,
          active ? tw`text-white font-bold` : tw`text-[#606060]`,
        ]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const messages: Record<TabKey, { emoji: string; title: string; sub: string }> = {
    thisWeek: {
      emoji: '📅',
      title: 'No sessions this week',
      sub: 'You have no scheduled sessions for this week.',
    },
    upcoming: {
      emoji: '🔭',
      title: 'No upcoming sessions',
      sub: 'Your future sessions will appear here.',
    },
    past: {
      emoji: '📖',
      title: 'No past sessions',
      sub: 'Completed and missed sessions will appear here.',
    },
  };

  const { emoji, title, sub } = messages[tab];

  return (
    <View style={tw`items-center justify-center py-20`}>
      <AppText style={tw`text-5xl mb-4`}>{emoji}</AppText>
      <BoldText style={tw`text-lg text-gray-900 dark:text-white mb-2 text-center`}>
        {title}
      </BoldText>
      <AppText style={tw`text-sm text-gray-500 dark:text-neutral-400 text-center px-8`}>
        {sub}
      </AppText>
    </View>
  );
}

// ─── Tab content wrappers ─────────────────────────────────────────────────────

function ThisWeekTab({
  onReschedule,
  onJoinStart,
}: {
  onReschedule: (t: RescheduleTarget) => void;
  onJoinStart: () => void;
}) {
  const { data, isLoading, refetch } = useLearnerClassesByBucket('today');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <ActivityIndicator color="#3B883E" style={tw`my-8`} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B883E" />
      }
    >
      {!data || data.length === 0 ? (
        <EmptyState tab="thisWeek" />
      ) : (
        data.map((item: LearnerClassListItem) => (
          <SessionCard
            key={item.classSeriesId}
            mode="upcoming"
            item={item}
            onReschedule={() =>
              onReschedule({
                sessionId: item.nextSessionId ?? item.classSeriesId,
                tutorName: item.tutorName,
                startUtc: item.nextSessionStartUtc ?? '',
                endUtc: item.nextSessionEndUtc ?? '',
              })
            }
            onJoinStart={onJoinStart}
          />
        ))
      )}
    </ScrollView>
  );
}

function UpcomingTab({
  onReschedule,
  onJoinStart,
}: {
  onReschedule: (t: RescheduleTarget) => void;
  onJoinStart: () => void;
}) {
  const { data, isLoading, refetch } = useLearnerClassesByBucket('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <ActivityIndicator color="#3B883E" style={tw`my-8`} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B883E" />
      }
    >
      {!data || data.length === 0 ? (
        <EmptyState tab="upcoming" />
      ) : (
        data.map((item: LearnerClassListItem) => (
          <SessionCard
            key={item.classSeriesId}
            mode="upcoming"
            item={item}
            onReschedule={() =>
              onReschedule({
                sessionId: item.nextSessionId ?? item.classSeriesId,
                tutorName: item.tutorName,
                startUtc: item.nextSessionStartUtc ?? '',
                endUtc: item.nextSessionEndUtc ?? '',
              })
            }
            onJoinStart={onJoinStart}
          />
        ))
      )}
    </ScrollView>
  );
}

function PastTab({
  onReschedule,
  onJoinStart,
}: {
  onReschedule: (t: RescheduleTarget) => void;
  onJoinStart: () => void;
}) {
  const { data, isLoading, refetch } = useLearnerPastSessions();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <ActivityIndicator color="#3B883E" style={tw`my-8`} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B883E" />
      }
    >
      {!data || data.length === 0 ? (
        <EmptyState tab="past" />
      ) : (
        data.map((item: PastSession) => (
          <SessionCard
            key={item.sessionId}
            mode="past"
            item={item}
            onReschedule={() =>
              onReschedule({
                sessionId: item.sessionId,
                tutorName: item.tutorName,
                startUtc: item.startUtc,
                endUtc: item.endUtc,
              })
            }
            onJoinStart={onJoinStart}
          />
        ))
      )}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MySessionsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('thisWeek');
  const [rescheduleTarget, setRescheduleTarget] = useState<RescheduleTarget | null>(null);
  const [joiningVisible, setJoiningVisible] = useState(false);
  const [successStartUtc, setSuccessStartUtc] = useState<string | null>(null);

  const handleReschedule = (target: RescheduleTarget) => {
    setRescheduleTarget(target);
  };

  const handleJoinStart = () => {
    setJoiningVisible(true);
    setTimeout(() => setJoiningVisible(false), 2500);
  };

  const handleRescheduleSuccess = (newStartUtc: string) => {
    setSuccessStartUtc(newStartUtc);
  };

  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-gray-50 dark:bg-neutral-900`}>
      {/* Success toast — positioned absolutely inside SafeAreaView */}
      {successStartUtc && (
        <RescheduleSuccessToast
          newStartUtc={successStartUtc}
          onDismiss={() => setSuccessStartUtc(null)}
        />
      )}

      {/* Header */}
      <View style={tw`flex-row items-center gap-2 px-5 py-2 bg-white dark:bg-neutral-900`}>
        <TouchableOpacity
          style={tw`w-[26px] h-[26px] border border-[rgba(208,217,226,0.3)] rounded-full items-center justify-center`}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-base leading-none`}>←</AppText>
        </TouchableOpacity>
        <BoldText style={tw`text-[#171717] dark:text-white text-base font-bold`}>
          My Sessions
        </BoldText>
      </View>

      {/* Tab selector */}
      <View style={tw`px-4 pt-3 pb-1 bg-white dark:bg-neutral-900`}>
        <View
          style={tw`flex-row bg-[rgba(255,255,255,0.42)] border border-[rgba(195,201,209,0.32)] rounded-[30px] p-2 gap-2`}
        >
          <TabPill
            label="This Week"
            active={activeTab === 'thisWeek'}
            onPress={() => setActiveTab('thisWeek')}
          />
          <TabPill
            label="Upcoming"
            active={activeTab === 'upcoming'}
            onPress={() => setActiveTab('upcoming')}
          />
          <TabPill
            label="Past"
            active={activeTab === 'past'}
            onPress={() => setActiveTab('past')}
          />
        </View>
      </View>

      {/* Content */}
      <View style={tw`flex-1 px-4 pt-3`}>
        {activeTab === 'thisWeek' && (
          <ThisWeekTab onReschedule={handleReschedule} onJoinStart={handleJoinStart} />
        )}
        {activeTab === 'upcoming' && (
          <UpcomingTab onReschedule={handleReschedule} onJoinStart={handleJoinStart} />
        )}
        {activeTab === 'past' && (
          <PastTab onReschedule={handleReschedule} onJoinStart={handleJoinStart} />
        )}
      </View>

      {/* Modals */}
      {rescheduleTarget && (
        <RescheduleModal
          visible={!!rescheduleTarget}
          sessionId={rescheduleTarget.sessionId}
          tutorName={rescheduleTarget.tutorName}
          currentStartUtc={rescheduleTarget.startUtc}
          currentEndUtc={rescheduleTarget.endUtc}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      <JoiningSessionModal visible={joiningVisible} />
    </SafeAreaView>
  );
}
