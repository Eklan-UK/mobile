import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '@/lib/api';
import { ANDROID_STORE_URL, IOS_STORE_URL } from '@/constants/store-urls';
import type { ForceUpdateEvaluation, MobileAppConfig } from '@/types/force-update';
import { compareSemver } from '@/utils/semver';
import { logger } from '@/utils/logger';

const DEFAULT_TITLE = 'Update required';
const DEFAULT_MESSAGE =
  'A new version of Eklan is required to continue. Please update from the store.';

/** Skip force-update in local/dev builds unless explicitly enabled for testing. */
export function shouldSkipForceUpdateCheck(): boolean {
  if (!__DEV__) return false;
  return process.env.EXPO_PUBLIC_FORCE_UPDATE_CHECK !== '1';
}

export function getInstalledAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

function isValidAppConfig(value: unknown): value is MobileAppConfig {
  if (!value || typeof value !== 'object') return false;
  const cfg = value as Record<string, unknown>;
  return (
    typeof cfg.minimumIosVersion === 'string' &&
    cfg.minimumIosVersion.trim().length > 0 &&
    typeof cfg.minimumAndroidVersion === 'string' &&
    cfg.minimumAndroidVersion.trim().length > 0
  );
}

function unwrapAppConfig(payload: unknown): MobileAppConfig | null {
  if (isValidAppConfig(payload)) return payload;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (isValidAppConfig(inner)) return inner;
  }
  return null;
}

/**
 * Fetch public app-config. Returns null on network/timeout/invalid data (fail-open).
 */
export async function fetchAppConfig(): Promise<MobileAppConfig | null> {
  try {
    const response = await apiClient.get('/api/v1/mobile/app-config');
    const config = unwrapAppConfig(response.data);
    if (!config) {
      logger.log('[ForceUpdate] Invalid app-config payload — fail open');
      return null;
    }
    return config;
  } catch (error) {
    logger.log('[ForceUpdate] Failed to fetch app-config — fail open', error);
    return null;
  }
}

export function evaluateForceUpdate(config: MobileAppConfig): ForceUpdateEvaluation {
  const installed = getInstalledAppVersion();
  const isIos = Platform.OS === 'ios';
  const minimum = isIos ? config.minimumIosVersion : config.minimumAndroidVersion;
  const storeUrl =
    (isIos ? config.iosStoreUrl : config.androidStoreUrl)?.trim() ||
    (isIos ? IOS_STORE_URL : ANDROID_STORE_URL);

  const required = compareSemver(installed, minimum) < 0;

  return {
    required,
    storeUrl,
    title: config.title?.trim() || DEFAULT_TITLE,
    message: config.message?.trim() || DEFAULT_MESSAGE,
  };
}

/**
 * Fetch + evaluate. Fail-open: never requires update when check is skipped or fetch fails.
 */
export async function checkForceUpdate(): Promise<ForceUpdateEvaluation | null> {
  if (shouldSkipForceUpdateCheck()) {
    logger.log('[ForceUpdate] Skipping check in __DEV__');
    return null;
  }

  const config = await fetchAppConfig();
  if (!config) return null;

  const evaluation = evaluateForceUpdate(config);
  logger.log('[ForceUpdate] Evaluated', {
    installed: getInstalledAppVersion(),
    required: evaluation.required,
  });
  return evaluation;
}
