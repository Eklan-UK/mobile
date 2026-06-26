import {
  DEFAULT_CELEBRATION_SOUND_URL,
  type DrillCompletionEffects,
} from '@/types/drill.types';
import { setAudioModeSafely } from '@/utils/audio';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let celebrationSound: Audio.Sound | null = null;
let confettiTrigger: (() => void) | null = null;

export function registerDrillConfettiTrigger(fn: (() => void) | null): void {
  confettiTrigger = fn;
}

export function unregisterDrillConfettiTrigger(): void {
  confettiTrigger = null;
}

/** Unload on screen unmount */
export async function unloadDrillCelebrationSound(): Promise<void> {
  if (!celebrationSound) return;
  try {
    await celebrationSound.unloadAsync();
  } catch {
    /* best-effort */
  }
  celebrationSound = null;
}

/**
 * End-of-drill pass: MP3 + success haptic + confetti.
 * Mirrors web `playDrillEndCelebration(soundUrl?)`.
 */
export async function playDrillEndCelebration(
  effects?: DrillCompletionEffects | null,
): Promise<void> {
  const soundUrl = effects?.soundUrl?.trim() || DEFAULT_CELEBRATION_SOUND_URL;
  const triggerConfetti = effects?.triggerConfetti ?? true;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* simulators */
  }

  if (triggerConfetti) {
    setTimeout(() => {
      try {
        confettiTrigger?.();
      } catch {
        /* best-effort */
      }
    }, 100);
  }

  try {
    await setAudioModeSafely({ playsInSilentModeIOS: true });
    await unloadDrillCelebrationSound();
    const { sound } = await Audio.Sound.createAsync(
      { uri: soundUrl },
      { shouldPlay: true },
    );
    celebrationSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
        if (celebrationSound === sound) celebrationSound = null;
      }
    });
  } catch {
    /* CDN / network — haptics still run */
  }
}
