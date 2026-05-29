import * as Updates from 'expo-updates';
import { AppState } from 'react-native';
import { logger, reportError } from '@/utils/logger';

const BOOT_WINDOW_MS = 55_000;
const RELOAD_COOLDOWN_MS = 10 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 3_000;
const CHECK_TIMEOUT_MS = 20_000;
const FETCH_TIMEOUT_MS = 45_000;

let firstPaintAt: number | null = null;
let lastReloadAt = 0;
let checkInFlight = false;
let pendingReload = false;

export type OtaCheckSource = 'cold' | 'foreground';

export function markOtaFirstPaint(): void {
  if (firstPaintAt === null) {
    firstPaintAt = Date.now();
  }
}

export function isOtaBootWindowActive(): boolean {
  if (firstPaintAt === null) return true;
  return Date.now() - firstPaintAt < BOOT_WINDOW_MS;
}

export function getInitialOtaCheckDelayMs(): number {
  return INITIAL_CHECK_DELAY_MS;
}

function shouldSkipOta(): boolean {
  if (__DEV__) return true;
  if (!Updates.isEnabled) return true;
  if (Updates.isEmergencyLaunch) {
    logger.log('[OTA] Emergency launch — skipping update operations');
    return true;
  }
  return false;
}

export function canApplyOtaReload(appReady: boolean): boolean {
  if (shouldSkipOta()) return false;
  if (!appReady) return false;
  if (isOtaBootWindowActive()) return false;
  if (AppState.currentState !== 'active') return false;
  if (Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return false;
  return true;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    }),
  ]);
}

async function fetchUpdateIfAvailable(): Promise<boolean> {
  const update = await withTimeout(
    Updates.checkForUpdateAsync(),
    CHECK_TIMEOUT_MS,
    'Update check'
  );

  if (!update.isAvailable) {
    logger.log('[OTA] No update available');
    return false;
  }

  logger.log('[OTA] Update available, downloading…');
  await withTimeout(
    Updates.fetchUpdateAsync(),
    FETCH_TIMEOUT_MS,
    'Update fetch'
  );
  logger.log('[OTA] Download complete');
  return true;
}

async function tryReload(appReady: boolean): Promise<void> {
  if (!pendingReload) return;
  if (!canApplyOtaReload(appReady)) return;

  pendingReload = false;
  lastReloadAt = Date.now();

  try {
    logger.log('[OTA] Applying downloaded update (reload)');
    await Updates.reloadAsync();
  } catch (error) {
    pendingReload = true;
    reportError('[OTA] Reload failed', error);
  }
}

/**
 * Check for updates. On cold start: download only (no reload). On foreground: download
 * and reload when policy allows (never during boot window or on failure).
 */
export async function runOtaUpdateCheck(
  source: OtaCheckSource,
  appReady: boolean
): Promise<void> {
  if (shouldSkipOta()) return;
  if (checkInFlight) return;

  checkInFlight = true;

  try {
    logger.log('[OTA] Checking for update…', {
      source,
      runtimeVersion: Updates.runtimeVersion,
      channel: Updates.channel,
      updateId: Updates.updateId,
    });

    const downloaded = await fetchUpdateIfAvailable();
    if (!downloaded) {
      await tryReload(appReady);
      return;
    }

    if (source === 'cold') {
      pendingReload = true;
      logger.log('[OTA] Update staged — reload deferred until safe foreground');
      return;
    }

    if (canApplyOtaReload(appReady)) {
      pendingReload = false;
      lastReloadAt = Date.now();
      logger.log('[OTA] Applying update on foreground');
      await Updates.reloadAsync();
      return;
    }

    pendingReload = true;
    logger.log('[OTA] Update staged — reload deferred (boot window or cooldown)');
  } catch (error) {
    reportError('[OTA] Update check failed (continuing on current bundle)', error);
  } finally {
    checkInFlight = false;
  }
}

/** Retry a staged reload when app becomes ready or returns to foreground. */
export async function applyStagedOtaReloadIfSafe(appReady: boolean): Promise<void> {
  if (shouldSkipOta()) return;
  await tryReload(appReady);
}
