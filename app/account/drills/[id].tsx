import { openAssignedDrill } from '@/utils/drillNavigation';
import { logger } from '@/utils/logger';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

function coerceString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value);
}

/**
 * Deep link: elkan://account/drills/{id}?assignmentId=…
 * Fetches the drill and navigates to the practice screen.
 */
export default function AccountDrillOpen() {
  const { id, assignmentId } = useLocalSearchParams<{
    id?: string;
    assignmentId?: string;
  }>();

  useEffect(() => {
    const drillId = coerceString(id);
    if (!drillId) {
      router.replace('/(tabs)/plan' as never);
      return;
    }

    const open = async () => {
      try {
        await openAssignedDrill(drillId, coerceString(assignmentId));
      } catch (error) {
        logger.warn('[AccountDrillOpen] Failed to open drill:', error);
        router.replace('/(tabs)/plan' as never);
      }
    };

    void open();
  }, [id, assignmentId]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
