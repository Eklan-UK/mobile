import { LearningJourneyTopicSection } from '@/components/learning-journey/LearningJourneyTopicSection';
import { AppText, BoldText } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  getLearningJourneyPart,
  isValidLearningJourneyPart,
  type LearningJourneyPartId,
} from '@/domain/learning-journey/learning-journey.catalog';
import {
  getDrillsForPart,
  groupDrillsByJourney,
} from '@/domain/learning-journey/group-journey-drills';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import type { DrillAssignment } from '@/types/drill.types';
import {
  navigatePlanDrillRow,
  navigatePlanFreeTalkRow,
} from '@/utils/planRowNavigation';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LearningJourneyPartScreen() {
  const { part: partParam } = useLocalSearchParams<{ part: string }>();
  const { t } = useTranslation();
  const isSubscribed = useIsSubscribed();
  const { colors: c } = useSemanticTheme();
  const { prefetchDrillAssignment } = usePrefetch();
  const { data, isLoading, refetch } = useLearnerDrills();

  const partNumber = parseInt(String(partParam ?? ''), 10) as LearningJourneyPartId;
  const isValidPart = isValidLearningJourneyPart(partNumber);
  const partDef = isValidPart ? getLearningJourneyPart(partNumber) : undefined;

  const topicGroups = useMemo(() => {
    if (!isValidPart) return [];
    const grouped = groupDrillsByJourney(data?.drills ?? []);
    return getDrillsForPart(grouped, partNumber);
  }, [data?.drills, isValidPart, partNumber]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (!isSubscribed) {
      router.replace('/premium' as never);
      return;
    }
    if (!isValidPart) {
      router.replace('/(tabs)/plan' as never);
    }
  }, [isSubscribed, isValidPart]);

  const handleDrillPress = useCallback((item: DrillAssignment) => {
    navigatePlanDrillRow(item);
  }, []);

  const handleFreeTalkPress = useCallback((item: DrillAssignment) => {
    navigatePlanFreeTalkRow(item, false);
  }, []);

  if (!isSubscribed || !isValidPart || !partDef) {
    return (
      <SafeAreaView
        edges={['top']}
        style={tw`flex-1 bg-gray-50 dark:bg-neutral-900 items-center justify-center`}
      >
        <ActivityIndicator size="large" color="#22c55e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-gray-50 dark:bg-neutral-900`}>
      <View
        style={[
          tw`px-5 pt-4 pb-4 border-b`,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`flex-row items-center gap-1 mb-3`}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${t('journey.backToJourney')}`}
        >
          <Ionicons name="arrow-back" size={18} color={c.textSecondary} />
          <AppText style={[tw`text-sm font-medium`, { color: c.textSecondary }]}>
            {t('journey.backToJourney')}
          </AppText>
        </TouchableOpacity>

        <AppText style={[tw`text-xs font-semibold uppercase`, { color: c.textSecondary }]}>
          {t('journey.mission', { part: partNumber })}
        </AppText>
        <BoldText style={[tw`text-2xl font-bold mt-1`, { color: c.textPrimary }]}>
          {partDef.title}
        </BoldText>
      </View>

      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 py-6 pb-24 gap-8`}
          showsVerticalScrollIndicator={false}
        >
          {topicGroups.map((group) => (
            <LearningJourneyTopicSection
              key={group.topicId}
              topicId={group.topicId}
              topicTitle={group.topicTitle}
              items={group.items}
              onDrillPress={handleDrillPress}
              onFreeTalkPress={handleFreeTalkPress}
              onDrillPressIn={prefetchDrillAssignment}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
