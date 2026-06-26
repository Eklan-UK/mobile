import { playDrillEndCelebration, unloadDrillCelebrationSound } from '@/lib/drill-celebration';
import { playPracticeFeedback } from '@/lib/practice-feedback';
import {
  DEFAULT_CELEBRATION_SOUND_URL,
  type DrillCompletionEffects,
} from '@/types/drill.types';
import { useEffect } from 'react';

const DEFAULT_CELEBRATION_EFFECTS: DrillCompletionEffects = {
  soundUrl: DEFAULT_CELEBRATION_SOUND_URL,
  triggerConfetti: true,
};

export function useDrillScoreCelebration(
  passed: boolean | null | undefined,
  effects?: DrillCompletionEffects | null,
): void {
  useEffect(() => {
    if (passed == null) return;
    if (passed) {
      void playDrillEndCelebration(effects ?? DEFAULT_CELEBRATION_EFFECTS);
    } else {
      void playPracticeFeedback('failure');
    }
    return () => {
      void unloadDrillCelebrationSound();
    };
  }, [passed, effects]);
}
