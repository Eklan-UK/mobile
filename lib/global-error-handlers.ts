import * as Updates from 'expo-updates';
import { reportError } from '@/utils/logger';
import { logger } from '@/utils/logger';

let initialized = false;

export function initGlobalErrorHandlers(): void {
  if (initialized) return;
  initialized = true;

  if (__DEV__) {
    logger.log('[errors] Updates context', {
      isEmergencyLaunch: Updates.isEmergencyLaunch,
      runtimeVersion: Updates.runtimeVersion,
      channel: Updates.channel,
      updateId: Updates.updateId,
    });
  }

  const ErrorUtils = (global as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  }).ErrorUtils;
  const previousHandler = ErrorUtils?.getGlobalHandler?.();

  ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    reportError(isFatal ? 'Fatal JS error' : 'JS error', error);
    // In production, avoid chaining the default handler for fatals (hard crash).
    // Render errors are handled by RootErrorBoundary; OTA skips emergency launches.
    if (__DEV__ || !isFatal) {
      previousHandler?.(error, isFatal);
    }
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rejectionTracking = require('promise/setimmediate/rejection-tracking');
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (_id: number, error: unknown) => {
        reportError('Unhandled promise rejection', error);
      },
      onHandled: () => {},
    });
  } catch (error) {
    reportError('Failed to enable promise rejection tracking', error);
  }
}
