import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';
import Constants from 'expo-constants';

// Safely import expo-device - may not be available if native module isn't linked
let Device: any = null;
let deviceWarningShown = false;
try {
  Device = require('expo-device');
} catch (error) {
  if (!deviceWarningShown) {
    logger.warn('⚠️ expo-device module not available. Run: npx expo prebuild --clean && npx expo run:android');
    deviceWarningShown = true;
  }
}

export interface RegisterPushTokenData {
  platform: 'expo' | 'web' | 'fcm';
  token: string;
  deviceInfo?: {
    deviceName?: string;
    osVersion?: string;
    appVersion?: string;
    browser?: string;
  };
}

/**
 * Notification service for managing push tokens
 */
export const notificationService = {
  /**
   * Register a push token with the backend
   */
  async registerToken(data: RegisterPushTokenData): Promise<{ success: boolean; tokenId?: string }> {
    try {
      logger.log('📤 Registering push token:', data.platform);

      const response = await apiClient.post('/api/v1/notifications/register', {
        platform: data.platform,
        token: data.token,
        deviceInfo: {
          deviceName: Device?.deviceName || undefined,
          osVersion: Device?.osVersion || undefined,
          appVersion: Constants.expoConfig?.version || undefined,
          ...data.deviceInfo,
        },
      });

      if (response.data?.success) {
        logger.log('✅ Push token registered successfully');
        return { success: true, tokenId: response.data.tokenId };
      }

      throw new Error('Failed to register push token');
    } catch (error: any) {
      logger.error('❌ Error registering push token:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to register push token');
    }
  },

  /**
   * Unregister a push token
   */
  async unregisterToken(token: string): Promise<boolean> {
    try {
      logger.log('📤 Unregistering push token');

      const response = await apiClient.delete(`/api/v1/notifications/register?token=${encodeURIComponent(token)}`);

      if (response.data?.success) {
        logger.log('✅ Push token unregistered successfully');
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('❌ Error unregistering push token:', error);
      return false;
    }
  },
};

