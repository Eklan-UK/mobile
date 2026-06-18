import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { setAudioModeSafely } from '@/utils/audio';

export type PracticeFeedbackKind = 'success' | 'failure';

const SAMPLE_RATE = 44100;

const TONE_SEQUENCES: Record<
  PracticeFeedbackKind,
  Array<{ frequency: number; durationMs: number; gapMs: number }>
> = {
  success: [
    { frequency: 523, durationMs: 90, gapMs: 30 },
    { frequency: 659, durationMs: 110, gapMs: 0 },
  ],
  failure: [
    { frequency: 220, durationMs: 120, gapMs: 40 },
    { frequency: 165, durationMs: 130, gapMs: 0 },
  ],
};

function sampleWave(
  waveType: 'sine' | 'triangle',
  frequency: number,
  timeSec: number
): number {
  if (waveType === 'sine') {
    return Math.sin(2 * Math.PI * frequency * timeSec);
  }
  const period = 1 / frequency;
  const phase = (timeSec % period) / period;
  return 4 * Math.abs(phase - 0.5) - 1;
}

function applyEnvelope(
  sample: number,
  sampleIndex: number,
  totalSamples: number
): number {
  const attackSamples = Math.max(1, Math.floor(totalSamples * 0.08));
  const releaseSamples = Math.max(1, Math.floor(totalSamples * 0.35));
  let gain = 0.18;

  if (sampleIndex < attackSamples) {
    gain *= sampleIndex / attackSamples;
  } else if (sampleIndex > totalSamples - releaseSamples) {
    const releaseIndex = totalSamples - sampleIndex;
    gain *= releaseIndex / releaseSamples;
  }

  return sample * gain;
}

function synthesizeTonePcm(kind: PracticeFeedbackKind): Int16Array {
  const waveType = kind === 'success' ? 'sine' : 'triangle';
  const steps = TONE_SEQUENCES[kind];
  const totalDurationMs = steps.reduce(
    (sum, step) => sum + step.durationMs + step.gapMs,
    0
  );
  const totalSamples = Math.ceil((totalDurationMs / 1000) * SAMPLE_RATE);
  const pcm = new Int16Array(totalSamples);

  let timeOffsetSec = 0;
  for (const step of steps) {
    const stepSamples = Math.ceil((step.durationMs / 1000) * SAMPLE_RATE);
    const startSample = Math.floor(timeOffsetSec * SAMPLE_RATE);

    for (let i = 0; i < stepSamples; i++) {
      const sampleIndex = startSample + i;
      if (sampleIndex >= totalSamples) break;

      const t = (timeOffsetSec + i / SAMPLE_RATE);
      const raw = sampleWave(waveType, step.frequency, t);
      const enveloped = applyEnvelope(raw, i, stepSamples);
      pcm[sampleIndex] = Math.max(
        -32767,
        Math.min(32767, Math.round(enveloped * 32767))
      );
    }

    timeOffsetSec += (step.durationMs + step.gapMs) / 1000;
  }

  return pcm;
}

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += BASE64_CHARS[a >> 2];
    result += BASE64_CHARS[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b & 15) << 2) | (c >> 6)] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[c & 63] : '=';
  }
  return result;
}

function pcmToWavBase64(pcm: Int16Array): string {
  const dataLength = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(44 + i * 2, pcm[i], true);
  }

  return uint8ArrayToBase64(new Uint8Array(buffer));
}

async function playTone(kind: PracticeFeedbackKind): Promise<void> {
  const pcm = synthesizeTonePcm(kind);
  const base64 = pcmToWavBase64(pcm);
  const uri = `${FileSystem.cacheDirectory}practice-feedback-${kind}-${Date.now()}.wav`;

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: 'base64',
  });

  await setAudioModeSafely({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1.0 });

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      void sound.unloadAsync();
      void FileSystem.deleteAsync(uri, { idempotent: true });
    }
  });
}

export async function playPracticeFeedback(kind: PracticeFeedbackKind): Promise<void> {
  try {
    await Haptics.notificationAsync(
      kind === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
  } catch {
    /* best-effort — simulators may not support haptics */
  }

  try {
    await playTone(kind);
  } catch {
    /* best-effort — audio may be unavailable */
  }
}
