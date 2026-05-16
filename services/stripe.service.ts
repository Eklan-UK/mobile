import apiClient, { API_BASE_URL } from '@/lib/api';
import { logger } from '@/utils/logger';
import axios from 'axios';

/**
 * Defaults match docs/stripe-implementation.md. Override if your backend mounts Stripe elsewhere
 * (then set EXPO_PUBLIC_STRIPE_CHECKOUT_PATH / EXPO_PUBLIC_STRIPE_PORTAL_PATH and rebuild).
 *
 * If you still get 404, the request is usually not hitting the Next app that defines these routes:
 * align `EXPO_PUBLIC_API_URL` with that deployment (no wrong host, no `/api` double-prefix — see `normalizeApiBaseUrl` in lib/api.ts).
 */
export const STRIPE_CHECKOUT_PATH =
  process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_PATH ?? '/api/v1/stripe/checkout';
export const STRIPE_PORTAL_PATH =
  process.env.EXPO_PUBLIC_STRIPE_PORTAL_PATH ?? '/api/v1/stripe/portal';

function checkoutUnavailableMessage(): string {
  return `Checkout returned 404. The app is calling POST ${API_BASE_URL}${STRIPE_CHECKOUT_PATH} — if that is not your Next.js server, fix EXPO_PUBLIC_API_URL (and proxy) until Postman hits the same host that serves src/app/api/v1/stripe/checkout/route.ts. 401 means the route exists; fix auth instead.`;
}

function portalUnavailableMessage(): string {
  return `Billing portal returned 404 at POST ${API_BASE_URL}${STRIPE_PORTAL_PATH}. Fix EXPO_PUBLIC_API_URL / proxy so requests reach the Next app, or set EXPO_PUBLIC_STRIPE_PORTAL_PATH.`;
}

export async function createStripeCheckoutSession(): Promise<string> {
  try {
    const response = await apiClient.post<{ url: string }>(STRIPE_CHECKOUT_PATH, {});
    const url = response.data?.url;
    if (!url || typeof url !== 'string') {
      logger.error('Stripe checkout: missing url in response', response.data);
      throw new Error('Could not start checkout. Please try again.');
    }
    return url;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      throw new Error(checkoutUnavailableMessage());
    }
    throw e;
  }
}

export async function createStripeBillingPortalSession(): Promise<string> {
  try {
    const response = await apiClient.post<{ url: string }>(STRIPE_PORTAL_PATH, {});
    const url = response.data?.url;
    if (!url || typeof url !== 'string') {
      logger.error('Stripe portal: missing url in response', response.data);
      throw new Error('Could not open billing portal. Please try again.');
    }
    return url;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      throw new Error(portalUnavailableMessage());
    }
    throw e;
  }
}
