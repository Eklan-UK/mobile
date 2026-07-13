import {
  beginCelebrationSession,
  playDrillEndCelebration,
  shouldPlayCelebration,
  unloadDrillCelebrationSound,
} from '@/lib/drill-celebration';
import { playPracticeFeedback } from '@/lib/practice-feedback';
import {
  DEFAULT_CELEBRATION_SOUND_URL,
  type DrillCompletionEffects,
} from '@/types/drill.types';
import { useLayoutEffect } from 'react';

const DEFAULT_CELEBRATION_EFFECTS: DrillCompletionEffects = {
  soundUrl: DEFAULT_CELEBRATION_SOUND_URL,
  triggerConfetti: true,
};

export function useDrillScoreCelebration(
  passed: boolean | null | undefined,
  effects?: DrillCompletionEffects | null,
): void {
  useLayoutEffect(() => {
    if (passed == null) return;

    const token = beginCelebrationSession();

    if (passed) {
      if (shouldPlayCelebration(token)) {
        void playDrillEndCelebration(effects ?? DEFAULT_CELEBRATION_EFFECTS);
      }
    } else if (shouldPlayCelebration(token)) {
      void playPracticeFeedback('failure');
    }

    return () => {
      void unloadDrillCelebrationSound();
    };
  }, [passed, effects]);
}
