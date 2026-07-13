import {
  preloadDrillCelebrationSound,
  resetCelebrationSession,
} from '@/lib/drill-celebration';
import type { DrillCompletionEffects } from '@/types/drill.types';
import { useEffect } from 'react';

export function usePreloadDrillCelebration(
  effects?: DrillCompletionEffects | null,
): void {
  useEffect(() => {
    if (effects == null) {
      resetCelebrationSession();
    }
    void preloadDrillCelebrationSound(effects);
  }, [effects?.soundUrl]);
}
