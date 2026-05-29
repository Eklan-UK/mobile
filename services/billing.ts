import { USER_CURRENT_KEY } from '@/hooks/useSettings';
import { queryClient } from '@/lib/query-client';
import {
  iapErrorMessage,
  initAppleIap,
  requestProSubscription,
  restorePurchasesAndVerify,
  showManageSubscriptions,
  verifyAndFinishPurchase,
} from '@/services/apple-iap.service';
import {
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
} from '@/services/stripe.service';
import { settingsService } from '@/services/settings.service';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/utils/logger';
import { isProSubscriber } from '@/utils/subscription';
import type { QueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

/**
 * Poll GET /api/v1/users/current until `user.isSubscribed === true`.
 * Shared by iOS IAP and Android Stripe deep-link flows.
 */
export async function pollUntilSubscribed(
  client: QueryClient = queryClient,
  maxAttempts: number = POLL_ATTEMPTS,
  intervalMs: number = POLL_INTERVAL_MS
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const data = await settingsService.getCurrentUser();
      client.setQueryData(USER_CURRENT_KEY, data);
      if (isProSubscriber(data.user)) {
        await useAuthStore.getState().checkSession();
        return true;
      }
    } catch (e) {
      logger.warn('Subscription poll attempt failed:', e);
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return false;
}

/**
 * Start upgrade flow: StoreKit on iOS, Stripe Checkout on Android.
 * iOS verifies with the server before returning; caller should poll afterward.
 */
export async function startUpgrade(): Promise<void> {
  if (Platform.OS === 'ios') {
    await initAppleIap();
    const purchase = await requestProSubscription();
    await verifyAndFinishPurchase(purchase);
    return;
  }

  const url = await createStripeCheckoutSession();
  await WebBrowser.openBrowserAsync(url);
}

/**
 * Manage subscription: Apple UI on iOS, Stripe Billing Portal on Android.
 */
export async function manageSubscription(): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      await showManageSubscriptions();
    } catch (e) {
      logger.warn('showManageSubscriptionsIOS failed, opening Settings fallback:', e);
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
    return;
  }

  const url = await createStripeBillingPortalSession();
  await WebBrowser.openBrowserAsync(url);
}

/**
 * Restore purchases: StoreKit restore + verify on iOS; refresh profile on Android.
 * @returns Whether the user is subscribed after restore/refresh.
 */
export async function restorePurchases(
  client: QueryClient = queryClient
): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const verified = await restorePurchasesAndVerify();
    if (!verified) return false;
    return pollUntilSubscribed(client);
  }

  const data = await settingsService.getCurrentUser();
  client.setQueryData(USER_CURRENT_KEY, data);
  await useAuthStore.getState().checkSession();
  return isProSubscriber(data.user);
}

export { iapErrorMessage };
