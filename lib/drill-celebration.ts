import {
  DEFAULT_CELEBRATION_SOUND_URL,
  type DrillCompletionEffects,
} from '@/types/drill.types';
import { setAudioModeSafely } from '@/utils/audio';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let celebrationSound: Audio.Sound | null = null;
let confettiTrigger: (() => void) | null = null;

let preloadedSound: Audio.Sound | null = null;
let preloadedUrl: string | null = null;
let preloadPromise: Promise<void> | null = null;

let claimedCelebrationToken: string | null = null;
let activeCelebrationToken: string | null = null;

export function registerDrillConfettiTrigger(fn: (() => void) | null): void {
  confettiTrigger = fn;
}

export function unregisterDrillConfettiTrigger(): void {
  confettiTrigger = null;
}

/** Create or reuse a token for one completion celebration (shared across early trigger + hook). */
export function beginCelebrationSession(): string {
  if (!activeCelebrationToken) {
    activeCelebrationToken = `${Date.now()}-${Math.random()}`;
  }
  return activeCelebrationToken;
}

/** Returns true only the first time this token is claimed for playback. */
export function shouldPlayCelebration(token: string): boolean {
  if (claimedCelebrationToken === token) return false;
  claimedCelebrationToken = token;
  return true;
}

export function resetCelebrationSession(): void {
  activeCelebrationToken = null;
  claimedCelebrationToken = null;
}

function setupPlaybackFinishHandler(sound: Audio.Sound): void {
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      void sound.unloadAsync();
      if (celebrationSound === sound) celebrationSound = null;
      if (preloadedSound === sound) {
        preloadedSound = null;
        preloadedUrl = null;
      }
    }
  });
}

/** Unload on screen unmount */
export async function unloadDrillCelebrationSound(): Promise<void> {
  if (!celebrationSound) return;
  try {
    await celebrationSound.unloadAsync();
  } catch {
    /* best-effort */
  }
  if (celebrationSound === preloadedSound) {
    preloadedSound = null;
    preloadedUrl = null;
    preloadPromise = null;
  }
  celebrationSound = null;
}

/** Load celebration MP3 into cache without playing (call on drill mount). */
export async function preloadDrillCelebrationSound(
  effects?: DrillCompletionEffects | null,
): Promise<void> {
  const soundUrl = effects?.soundUrl?.trim() || DEFAULT_CELEBRATION_SOUND_URL;

  if (preloadedUrl === soundUrl && preloadedSound) return;

  if (preloadPromise && preloadedUrl === soundUrl) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      await setAudioModeSafely({ playsInSilentModeIOS: true });

      if (preloadedSound && preloadedUrl !== soundUrl) {
        try {
          await preloadedSound.unloadAsync();
        } catch {
          /* best-effort */
        }
        preloadedSound = null;
        preloadedUrl = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUrl },
        { shouldPlay: false },
      );
      preloadedSound = sound;
      preloadedUrl = soundUrl;
    } catch {
      preloadedSound = null;
      preloadedUrl = null;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

async function playPreloadedCelebrationSound(): Promise<boolean> {
  if (!preloadedSound) return false;
  try {
    const status = await preloadedSound.getStatusAsync();
    if (!status.isLoaded) return false;
    await preloadedSound.setPositionAsync(0);
    await preloadedSound.playAsync();
    return true;
  } catch {
    return false;
  }
}

async function startCelebrationAudio(soundUrl: string): Promise<void> {
  try {
    await setAudioModeSafely({ playsInSilentModeIOS: true });

    if (preloadedUrl === soundUrl && preloadedSound) {
      const played = await playPreloadedCelebrationSound();
      if (played) {
        celebrationSound = preloadedSound;
        setupPlaybackFinishHandler(preloadedSound);
        return;
      }
    }

    if (celebrationSound && celebrationSound !== preloadedSound) {
      await unloadDrillCelebrationSound();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: soundUrl },
      { shouldPlay: true },
    );
    celebrationSound = sound;
    setupPlaybackFinishHandler(sound);
  } catch {
    /* CDN / network */
  }
}

/**
 * End-of-drill pass: MP3 + success haptic + confetti.
 * Audio starts immediately; haptics and confetti run in parallel.
 */
export async function playDrillEndCelebration(
  effects?: DrillCompletionEffects | null,
): Promise<void> {
  const soundUrl = effects?.soundUrl?.trim() || DEFAULT_CELEBRATION_SOUND_URL;
  const triggerConfetti = effects?.triggerConfetti ?? true;

  void startCelebrationAudio(soundUrl);

  void (async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* simulators */
    }
  })();

  if (triggerConfetti) {
    setTimeout(() => {
      try {
        confettiTrigger?.();
      } catch {
        /* best-effort */
      }
    }, 100);
  }
}
