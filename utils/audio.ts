import { Audio } from 'expo-av';
import { logger } from './logger';

/**
 * Safely sets the audio mode, handling keep-awake errors gracefully
 * @param options Audio mode options
 */
export async function setAudioModeSafely(
  options: any
): Promise<void> {
  try {
    await Audio.setAudioModeAsync(options);
  } catch (error: any) {
    // Handle keep-awake errors gracefully - these are non-critical
    if (
      error?.message?.includes('keep awake') ||
      error?.message?.includes('Unable to activate keep awake') ||
      error?.code === 'E_KEEP_AWAKE'
    ) {
      logger.warn('⚠️ Keep-awake activation failed (non-critical):', error.message);
      // Continue anyway - audio mode should still be set
      // The keep-awake error is usually non-critical for audio functionality
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

