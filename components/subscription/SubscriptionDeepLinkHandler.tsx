import {
  isSubscriptionCancelDeepLink,
  isSubscriptionSuccessDeepLink,
} from '@/constants/subscription-deeplinks';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Android only: opens `/premium` when Stripe redirects to `elkan://subscription/success`
 * or `.../cancel` (backend must use these URLs for success_url / cancel_url / return_url).
 * iOS uses StoreKit IAP — these deep links are never opened in normal flows.
 */
export function SubscriptionDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const go = (url: string | null) => {
      if (!url) return;
      if (isSubscriptionSuccessDeepLink(url)) {
        router.push('/premium?checkout=success' as never);
      } else if (isSubscriptionCancelDeepLink(url)) {
        router.push('/premium' as never);
      }
    };

    void Linking.getInitialURL().then(go);

    const sub = Linking.addEventListener('url', ({ url }) => go(url));
    return () => sub.remove();
  }, [router]);

  return null;
}
