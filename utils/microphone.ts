import { Audio } from 'expo-av';
import { Linking } from 'react-native';
import { ttsService } from '@/services/tts.service';
import { Alert } from '@/utils/alert';
import { setAudioModeSafely } from '@/utils/audio';

export type MicrophonePermissionStatus = 'granted' | 'denied' | 'blocked';

export async function ensureMicrophonePermission(): Promise<MicrophonePermissionStatus> {
  let { status, canAskAgain } = await Audio.getPermissionsAsync();

  if (status !== 'granted') {
    const result = await Audio.requestPermissionsAsync();
    status = result.status;
    canAskAgain = result.canAskAgain;
  }

  if (status === 'granted') return 'granted';
  if (status === 'denied' && canAskAgain === false) return 'blocked';
  return 'denied';
}

export function showMicrophonePermissionAlert(
  status: Exclude<MicrophonePermissionStatus, 'granted'>
): void {
  const message =
    status === 'blocked'
      ? 'Microphone access is turned off. Enable it in Settings to practice pronunciation.'
      : 'Microphone access is needed to analyze your pronunciation and give you feedback.';

  Alert.alert('Microphone needed', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => void Linking.openSettings() },
  ]);
}

export async function prepareAudioForRecording(): Promise<void> {
  await ttsService.stopAudio();
  await setAudioModeSafely({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
}

export function isRecordingPermissionError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = message.toLowerCase();
  return (
    lower.includes('permission') ||
    lower.includes('denied') ||
    lower.includes('not authorized') ||
    lower.includes('microphone')
  );
}
