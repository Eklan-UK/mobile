import { useEffect, useRef } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import {
  applyStagedOtaReloadIfSafe,
  getInitialOtaCheckDelayMs,
  markOtaFirstPaint,
  runOtaUpdateCheck,
} from '@/services/ota-updates';

interface OtaUpdateCoordinatorProps {
  /** Fonts loaded and splash hidden — app shell is visible. */
  appShellReady: boolean;
}

/**
 * Production OTA checks: deferred after interactions, no cold-start reload,
 * reload only on foreground after boot window + cooldown.
 */
export function OtaUpdateCoordinator({ appShellReady }: OtaUpdateCoordinatorProps) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const initialCheckDone = useRef(false);
  const appReady = appShellReady && hasHydrated;

  useEffect(() => {
    if (!appShellReady) return;
    markOtaFirstPaint();
  }, [appShellReady]);

  useEffect(() => {
    if (!appShellReady || initialCheckDone.current) return;

    initialCheckDone.current = true;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        void runOtaUpdateCheck('cold', appReady);
      }, getInitialOtaCheckDelayMs());
    });

    return () => {
      interactionTask.cancel();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [appShellReady, appReady]);

  useEffect(() => {
    if (!appReady) return;
    void applyStagedOtaReloadIfSafe(appReady);
  }, [appReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      void runOtaUpdateCheck('foreground', appReady);
      void applyStagedOtaReloadIfSafe(appReady);
    });

    return () => sub.remove();
  }, [appReady]);

  return null;
}
