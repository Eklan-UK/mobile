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

  const ErrorUtils = global.ErrorUtils;
  const previousHandler = ErrorUtils?.getGlobalHandler?.();

  ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    reportError(isFatal ? 'Fatal JS error' : 'JS error', error);
    previousHandler?.(error, isFatal);
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
