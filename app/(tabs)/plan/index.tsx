import { LearningJourneyPartCard } from '@/components/learning-journey/LearningJourneyPartCard';
import { SavedDrillsSection } from '@/components/learning-journey/SavedDrillsSection';
import { MyPlanHeader } from '@/components/plan/MyPlanHeader';
import { NextSessionCard } from '@/components/sessions/NextSessionCard';
import { AppText, BoldText } from '@/components/ui';
import {
  LEARNING_JOURNEY_PARTS,
} from '@/domain/learning-journey/learning-journey.catalog';
import { countPartJourneyProgress } from '@/domain/learning-journey/group-journey-drills';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { useLearnerClasses } from '@/hooks/useLearnerClasses';
import { useMyMissionEnrollments } from '@/hooks/useMyMissionEnrollments';
import { useTranslation } from '@/contexts/LanguageContext';
import tw from '@/lib/tw';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyPlanScreen() {
  const { t } = useTranslation();
  const isSubscribed = useIsSubscribed();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const expandSavedDrills = section === 'saved-drills';

  const { data, refetch: refetchDrills } = useLearnerDrills();
  const {
    data: enrolledParts,
    isError: enrollmentsError,
    refetch: refetchEnrollments,
  } = useMyMissionEnrollments();
  const { nextSession } = useLearnerClasses();
  const [refreshing, setRefreshing] = useState(false);

  const enrolledSet = useMemo(
    () => new Set(enrollmentsError ? [] : (enrolledParts ?? [])),
    [enrolledParts, enrollmentsError]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDrills(), refetchEnrollments()]);
    setRefreshing(false);
  };

  const drills = data?.drills ?? [];

  useFocusEffect(
    useCallback(() => {
      void refetchDrills();
      void refetchEnrollments();
    }, [refetchDrills, refetchEnrollments])
  );

  useEffect(() => {
    if (!isSubscribed) {
      router.replace('/premium' as never);
    }
  }, [isSubscribed]);

  if (!isSubscribed) {
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
      <MyPlanHeader />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 py-4 pb-24 gap-8`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
            colors={['#22c55e']}
          />
        }
      >
        <NextSessionCard session={nextSession} />

        <SavedDrillsSection title={t('account.savedDrills')} defaultExpanded={expandSavedDrills} />

        <View>
          <BoldText style={tw`text-base font-bold text-gray-900 dark:text-white mb-3`}>
            {t('journey.title')}
          </BoldText>

          {enrollmentsError && (
            <View
              style={tw`mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900`}
            >
              <AppText style={tw`text-sm text-red-700 dark:text-red-300 mb-2`}>
                {t('journey.enrollmentsLoadError')}
              </AppText>
              <TouchableOpacity
                onPress={() => void refetchEnrollments()}
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
              >
                <AppText style={tw`text-sm font-semibold text-red-700 dark:text-red-300`}>
                  {t('common.retry')}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {LEARNING_JOURNEY_PARTS.map((partDef) => {
            const { completed, total } = countPartJourneyProgress(drills, partDef.part);
            const isEnrolled = enrolledSet.has(partDef.part);
            return (
              <LearningJourneyPartCard
                key={partDef.part}
                part={partDef.part}
                completedCount={completed}
                totalCount={total}
                isEnrolled={isEnrolled}
                onPress={
                  isEnrolled
                    ? () => router.push(`/(tabs)/plan/journey/${partDef.part}` as never)
                    : undefined
                }
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
