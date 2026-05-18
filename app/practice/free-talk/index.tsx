import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import { aiService } from '@/services/ai.service';
import { useAuthStore } from '@/store/auth-store';
import {
  loadFreeTalkHistory,
  mergeFreeTalkHistory,
} from '@/store/free-talk-store';
import {
  formatScenarioType,
  type FreeTalkScenarioSummary,
  type FreeTalkHistoryEntryV1,
} from '@/types/free-talk';
import { format } from 'date-fns';

type Tab = 'ongoing' | 'history';

// ─── Scenario Card ────────────────────────────────────────────────────────────

const ScenarioCard = React.memo(function ScenarioCard({
  item,
  onPress,
}: {
  item: FreeTalkScenarioSummary;
  onPress: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={tw`bg-white dark:bg-neutral-800 border border-[rgba(231,234,237,0.5)] dark:border-neutral-700 rounded-2xl p-4 flex-row items-center gap-3 mb-3`}
      activeOpacity={0.7}
      onPress={() => onPress(item.id)}
    >
      <View style={tw`h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4CAF50]`}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
      </View>
      <View style={tw`flex-1`}>
        <BoldText style={tw`text-sm font-bold text-[#171717] dark:text-white mb-0.5`} numberOfLines={2}>
          {item.title}
        </BoldText>
        <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
          {formatScenarioType(item.scenarioType)}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
});

// ─── History Item ─────────────────────────────────────────────────────────────

const HistoryAccordionItem = React.memo(function HistoryAccordionItem({
  item,
}: {
  item: FreeTalkHistoryEntryV1;
}) {
  const [expanded, setExpanded] = useState(false);
  const score = item.gradeResult?.overallScore;
  const scoreColor =
    score == null ? '#999' : score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336';

  return (
    <View style={tw`bg-white dark:bg-neutral-800 border border-[rgba(231,234,237,0.5)] dark:border-neutral-700 rounded-2xl mb-3 overflow-hidden`}>
      <TouchableOpacity
        style={tw`p-4 flex-row items-center gap-3`}
        activeOpacity={0.7}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={tw`flex-1`}>
          <BoldText style={tw`text-sm font-bold text-[#171717] dark:text-white mb-0.5`} numberOfLines={2}>
            {item.scenarioTitle}
          </BoldText>
          <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
            {formatScenarioType(item.scenarioType)} ·{' '}
            {format(new Date(item.completedAt), 'MMM d, yyyy HH:mm')}
          </AppText>
        </View>
        {score != null && (
          <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: scoreColor + '20' }]}>
            <BoldText style={[tw`text-xs font-bold`, { color: scoreColor }]}>{score}%</BoldText>
          </View>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#D1D5DB"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={tw`border-t border-[rgba(231,234,237,0.5)] dark:border-neutral-700 px-4 pt-3 pb-4`}>
          {item.gradeResult && (
            <View style={tw`mb-3`}>
              <BoldText style={tw`text-xs font-bold text-[#171717] dark:text-white mb-2`}>
                Clinical Communication Behaviours
              </BoldText>
              {item.gradeResult.behaviours.map((b) => (
                <View key={b.id} style={tw`flex-row items-center gap-2 mb-1.5`}>
                  <Ionicons
                    name={
                      b.result === 'full'
                        ? 'checkmark-circle'
                        : b.result === 'partial'
                        ? 'remove-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={b.result === 'full' ? '#4CAF50' : b.result === 'partial' ? '#FF9800' : '#F44336'}
                  />
                  <AppText style={tw`text-xs text-[#555] dark:text-neutral-300 flex-1`}>{b.name}</AppText>
                  <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
                    {b.score} pt{b.score !== 1 ? 's' : ''}
                  </AppText>
                </View>
              ))}
              <View style={tw`mt-2 flex-row items-center gap-2`}>
                <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
                  Score: {item.gradeResult.rawScore}/{item.gradeResult.maxScore} ·{' '}
                  {item.gradeResult.competencyLevel}
                </AppText>
              </View>
            </View>
          )}
          {!!item.feedbackText && (
            <View>
              <BoldText style={tw`text-xs font-bold text-[#171717] dark:text-white mb-1`}>Feedback</BoldText>
              <AppText style={tw`text-xs text-[#555] dark:text-neutral-300 leading-relaxed`}>
                {item.feedbackText}
              </AppText>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ─── Hub Screen ───────────────────────────────────────────────────────────────

export default function FreeTalkHubScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('ongoing');
  const [historyEntries, setHistoryEntries] = useState<FreeTalkHistoryEntryV1[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scenarios query
  const {
    data: scenarios,
    isLoading: scenariosLoading,
    error: scenariosError,
    refetch,
  } = useQuery({
    queryKey: ['free-talk-scenarios'],
    queryFn: () => aiService.fetchFreeTalkScenarioSummaries(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Load history when History tab is active
  useEffect(() => {
    if (activeTab !== 'history' || !user?.id) return;
    let cancelled = false;

    async function load() {
      setHistoryLoading(true);
      const localEntries = await loadFreeTalkHistory(user!.id);
      try {
        const { attempts: serverAttempts } = await aiService.fetchFreeTalkAttempts({ limit: 50 });
        if (!cancelled) {
          setHistoryEntries(mergeFreeTalkHistory(serverAttempts, localEntries));
        }
      } catch {
        if (!cancelled) setHistoryEntries(localEntries);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [activeTab, user?.id]);

  const handleScenarioPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/practice/free-talk/session', params: { scenarioId: id } });
    },
    [router]
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/practice');
  }, [router]);

  const renderScenario = useCallback(
    ({ item }: { item: FreeTalkScenarioSummary }) => (
      <ScenarioCard item={item} onPress={handleScenarioPress} />
    ),
    [handleScenarioPress]
  );

  const renderHistory = useCallback(
    ({ item }: { item: FreeTalkHistoryEntryV1 }) => (
      <HistoryAccordionItem item={item} />
    ),
    []
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={tw`px-5 pt-4 pb-3 flex-row items-center gap-3`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
        <BoldText style={tw`text-xl font-bold text-[#101828] dark:text-white flex-1`}>
          Eklan Free Talk
        </BoldText>
      </View>

      {/* Tab Bar */}
      <View style={tw`flex-row mx-5 mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1`}>
        {(['ongoing', 'history'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={tw`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? 'bg-white dark:bg-neutral-700 shadow-sm' : ''}`}
            activeOpacity={0.7}
            onPress={() => setActiveTab(tab)}
          >
            <View style={tw`flex-row items-center gap-1.5`}>
              <AppText
                style={tw`text-sm ${activeTab === tab ? 'font-bold text-[#171717] dark:text-white' : 'text-[#777] dark:text-neutral-400'}`}
              >
                {tab === 'ongoing' ? 'Scenarios' : 'History'}
              </AppText>
              {tab === 'ongoing' && scenarios && scenarios.length > 0 && (
                <View style={tw`bg-[#4CAF50] rounded-full w-5 h-5 items-center justify-center`}>
                  <AppText style={tw`text-xs text-white font-bold`}>{scenarios.length}</AppText>
                </View>
              )}
              {tab === 'history' && historyEntries.length > 0 && (
                <View style={tw`bg-neutral-400 dark:bg-neutral-500 rounded-full w-5 h-5 items-center justify-center`}>
                  <AppText style={tw`text-xs text-white font-bold`}>{historyEntries.length}</AppText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'ongoing' ? (
        <View style={tw`flex-1 px-5`}>
          {scenariosLoading ? (
            <View style={tw`flex-1 items-center justify-center`}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 mt-3`}>
                Loading scenarios…
              </AppText>
            </View>
          ) : scenariosError ? (
            <View style={tw`flex-1 items-center justify-center px-6`}>
              <Ionicons name="cloud-offline-outline" size={40} color="#D1D5DB" />
              <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 text-center mt-3`}>
                {(scenariosError as Error).message === 'Subscription required'
                  ? 'A Pro subscription is required to access Free Talk.'
                  : 'Failed to load scenarios. Please try again.'}
              </AppText>
              <TouchableOpacity
                style={tw`mt-4 bg-[#4CAF50] px-5 py-2.5 rounded-xl`}
                onPress={() => refetch()}
              >
                <AppText style={tw`text-sm text-white font-bold`}>Retry</AppText>
              </TouchableOpacity>
            </View>
          ) : !scenarios || scenarios.length === 0 ? (
            <View style={tw`flex-1 items-center justify-center px-6`}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#D1D5DB" />
              <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 text-center mt-3`}>
                No scenarios available yet. Check back later.
              </AppText>
            </View>
          ) : (
            <FlatList
              data={scenarios}
              keyExtractor={(item) => item.id}
              renderItem={renderScenario}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`pb-6`}
            />
          )}
        </View>
      ) : (
        <View style={tw`flex-1 px-5`}>
          {historyLoading ? (
            <View style={tw`flex-1 items-center justify-center`}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 mt-3`}>
                Loading history…
              </AppText>
            </View>
          ) : historyEntries.length === 0 ? (
            <View style={tw`flex-1 items-center justify-center px-6`}>
              <Ionicons name="time-outline" size={40} color="#D1D5DB" />
              <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 text-center mt-3`}>
                No attempts yet. Complete a scenario to see your history here.
              </AppText>
            </View>
          ) : (
            <FlatList
              data={historyEntries}
              keyExtractor={(item) => item.id}
              renderItem={renderHistory}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`pb-6`}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
