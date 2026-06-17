import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Render-null component that activates push notification handling for the app.
 * Mount once in the root layout (alongside BackgroundPrefetcher).
 * Handles token registration, listener setup, and auth-state sync.
 */
export function PushNotificationManager() {
  usePushNotifications();
  return null;
}
