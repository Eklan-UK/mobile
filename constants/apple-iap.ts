/**
 * Apple In-App Purchase product ID for Eklan Pro monthly subscription.
 * Must match App Store Connect and server `APPLE_PRO_MONTHLY_PRODUCT_ID`.
 *
 * Override via `.env`: EXPO_PUBLIC_APPLE_PRO_MONTHLY_PRODUCT_ID=com.eklan.ai.pro.monthly
 */
export const APPLE_PRO_MONTHLY_PRODUCT_ID =
  process.env.EXPO_PUBLIC_APPLE_PRO_MONTHLY_PRODUCT_ID ?? 'com.eklan.ai.pro.monthly';

export const APPLE_VERIFY_PATH = '/api/v1/apple/verify';
