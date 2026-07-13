import { parseLearningJourneyPartId } from '@/domain/learning-journey/learning-journey.catalog';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * Deep link alias: eklan://account/drills/journey/{part} → Mission Detail
 * Invalid part (e.g. 6) redirects to My Plans.
 */
export default function AccountDrillsJourneyRedirect() {
  const { part: partParam } = useLocalSearchParams<{ part: string }>();

  useEffect(() => {
    const part = parseLearningJourneyPartId(partParam);
    if (part != null) {
      router.replace(`/(tabs)/plan/journey/${part}` as never);
    } else {
      router.replace('/(tabs)/plan' as never);
    }
  }, [partParam]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
