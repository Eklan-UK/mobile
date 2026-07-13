import { useNotificationBadgeSync } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Render-null component that activates push notification handling for the app.
 * Mount once in the root layout (alongside BackgroundPrefetcher).
 * Handles token registration, listener setup, auth-state sync, and badge sync.
 */
export function PushNotificationManager() {
  usePushNotifications();
  useNotificationBadgeSync();
  return null;
}
