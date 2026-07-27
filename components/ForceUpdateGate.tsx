import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, View, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '@/lib/tw';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { checkForceUpdate } from '@/services/force-update';
import type { ForceUpdateEvaluation } from '@/types/force-update';
import { logger } from '@/utils/logger';

/**
 * Full-screen hard block when the installed store binary is below the backend minimum.
 * Fail-open while checking; only mounts overlay when required === true.
 */
export function ForceUpdateGate() {
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState<ForceUpdateEvaluation | null>(null);

  const runCheck = useCallback(async () => {
    const result = await checkForceUpdate();
    if (result?.required) {
      setGate(result);
    } else {
      setGate(null);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void runCheck();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [runCheck]);

  const openStore = useCallback(async () => {
    if (!gate?.storeUrl) return;
    try {
      await Linking.openURL(gate.storeUrl);
    } catch (error) {
      logger.log('[ForceUpdate] Failed to open store URL', error);
    }
  }, [gate?.storeUrl]);

  if (!gate?.required) return null;

  return (
    <View
      style={[
        tw`absolute inset-0 z-50 bg-white dark:bg-neutral-900 px-6`,
        {
          paddingTop: insets.top + 48,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
      accessibilityViewIsModal
    >
      <View style={tw`flex-1 justify-center`}>
        <AppText
          weight="bold"
          style={tw`text-2xl text-neutral-900 dark:text-white mb-4 leading-tight`}
        >
          {gate.title}
        </AppText>
        <AppText
          style={tw`text-base text-neutral-500 dark:text-neutral-400 leading-relaxed`}
        >
          {gate.message}
        </AppText>
      </View>

      <Button fullWidth size="lg" onPress={openStore}>
        Update
      </Button>
    </View>
  );
}
