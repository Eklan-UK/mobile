import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * Deep link alias: eklan://account/drills → My Plans
 * Supports ?section=saved-drills and hash #saved-drills (web mirror).
 */
export default function AccountDrillsRedirect() {
  const { section } = useLocalSearchParams<{ section?: string }>();

  useEffect(() => {
    const redirect = async () => {
      let expandSaved = section === 'saved-drills';

      if (!expandSaved) {
        const url = await Linking.getInitialURL();
        if (url?.includes('#saved-drills')) {
          expandSaved = true;
        }
      }

      const target = expandSaved ? '/(tabs)/plan?section=saved-drills' : '/(tabs)/plan';
      router.replace(target as never);
    };

    void redirect();
  }, [section]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
