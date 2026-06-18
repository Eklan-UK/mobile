import { LearningJourneyPartCard } from '@/components/learning-journey/LearningJourneyPartCard';
import { SavedDrillsSection } from '@/components/learning-journey/SavedDrillsSection';
import { MyPlanHeader } from '@/components/plan/MyPlanHeader';
import { NextSessionCard } from '@/components/sessions/NextSessionCard';
import { BoldText } from '@/components/ui';
import {
  LEARNING_JOURNEY_PARTS,
  type LearningJourneyPartId,
} from '@/domain/learning-journey/learning-journey.catalog';
import { computePartProgress } from '@/domain/learning-journey/group-journey-drills';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { useLearnerClasses } from '@/hooks/useLearnerClasses';
import { useTranslation } from '@/contexts/LanguageContext';
import tw from '@/lib/tw';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyPlanScreen() {
  const { t } = useTranslation();
  const isSubscribed = useIsSubscribed();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const expandSavedDrills = section === 'saved-drills';

  const { data, refetch: refetchDrills } = useLearnerDrills();
  const { nextSession } = useLearnerClasses();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchDrills();
    setRefreshing(false);
  };

  const partProgress = useMemo(
    () => computePartProgress(data?.drills ?? []),
    [data?.drills]
  );

  useFocusEffect(
    useCallback(() => {
      void refetchDrills();
    }, [refetchDrills])
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
            My Learning Journey
          </BoldText>
          {LEARNING_JOURNEY_PARTS.map((partDef) => {
            const progress = partProgress[partDef.part as LearningJourneyPartId];
            return (
              <LearningJourneyPartCard
                key={partDef.part}
                part={partDef.part}
                completedCount={progress?.completed ?? 0}
                totalCount={progress?.total ?? 0}
                onPress={() =>
                  router.push(`/(tabs)/plan/journey/${partDef.part}` as never)
                }
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
