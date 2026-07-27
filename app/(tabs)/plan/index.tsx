import { LearningJourneyRoadmap } from '@/components/learning-journey/LearningJourneyRoadmap';
import { SavedDrillsSection } from '@/components/learning-journey/SavedDrillsSection';
import { MyPlanHeader } from '@/components/plan/MyPlanHeader';
import { NextSessionCard } from '@/components/sessions/NextSessionCard';
import { AppText, BoldText } from '@/components/ui';
import {
  deriveMissionStates,
  LEARNING_JOURNEY_PARTS,
  type LearningJourneyPartId,
  type PartProgressInput,
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

  const drills = data?.drills ?? [];

  const missionStates = useMemo(() => {
    const progressByPart: Partial<
      Record<LearningJourneyPartId, PartProgressInput>
    > = {};
    for (const partDef of LEARNING_JOURNEY_PARTS) {
      progressByPart[partDef.part] = countPartJourneyProgress(
        drills,
        partDef.part
      );
    }
    return deriveMissionStates(
      enrollmentsError ? [] : (enrolledParts ?? []),
      progressByPart
    );
  }, [drills, enrolledParts, enrollmentsError]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDrills(), refetchEnrollments()]);
    setRefreshing(false);
  };

  const openPart = useCallback((part: LearningJourneyPartId) => {
    router.push(`/(tabs)/plan/journey/${part}` as never);
  }, []);

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
        contentContainerStyle={tw`px-5 py-4 pb-24 gap-6`}
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

        <View style={tw`gap-3`}>
          <BoldText style={tw`text-base font-bold text-gray-900 dark:text-white px-1`}>
            {t('account.yourProgress')}
          </BoldText>
          <SavedDrillsSection
            title={t('account.savedDrills')}
            defaultExpanded={expandSavedDrills}
          />
        </View>

        <View>
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

          <LearningJourneyRoadmap states={missionStates} onOpenPart={openPart} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
