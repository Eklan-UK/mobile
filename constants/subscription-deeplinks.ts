/**
 * Backend Stripe Checkout / Billing Portal should redirect to these URLs
 * (see docs/stripe-implementation.md §16 — matches `scheme` in app.json: `elkan`).
 */
export const SUBSCRIPTION_SUCCESS_URL_PREFIX = 'elkan://subscription/success';
export const SUBSCRIPTION_CANCEL_URL_PREFIX = 'elkan://subscription/cancel';

export function isSubscriptionSuccessDeepLink(url: string): boolean {
  return (
    url.includes('subscription/success') ||
    url.includes('subscription%2Fsuccess')
  );
}

export function isSubscriptionCancelDeepLink(url: string): boolean {
  return url.includes('subscription/cancel') || url.includes('subscription%2Fcancel');
}
