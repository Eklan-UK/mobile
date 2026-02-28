import { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safely import expo-notifications - may not be available if native module isn't linked
let Notifications: any = null;
let notificationsWarningShown = false;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  if (!notificationsWarningShown) {
    logger.warn('⚠️ expo-notifications module not available. Run: npx expo prebuild --clean && npx expo run:android');
    notificationsWarningShown = true;
  }
}

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

// Configure how notifications are handled when app is in foreground
// Only set handler if module is available
if (Notifications && Notifications.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    logger.warn('⚠️ Failed to set notification handler:', error);
  }
}

const PUSH_TOKEN_STORAGE_KEY = '@push_token';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const { isAuthenticated, user } = useAuthStore();
  const [isModuleAvailable, setIsModuleAvailable] = useState(false);

  // Check if module is available
  useEffect(() => {
    if (!Notifications) {
      setIsModuleAvailable(false);
      return;
    }
    
    try {
      if (Notifications.getExpoPushTokenAsync && Notifications.getPermissionsAsync) {
        setIsModuleAvailable(true);
      } else {
        if (!notificationsWarningShown) {
          logger.warn('⚠️ expo-notifications native module not fully available. Rebuild the app.');
        }
        setIsModuleAvailable(false);
      }
    } catch (error) {
      if (!notificationsWarningShown) {
        logger.warn('⚠️ expo-notifications check failed:', error);
      }
      setIsModuleAvailable(false);
    }
  }, []);

  /**
   * Request notification permissions
   */
  const registerForPushNotifications = async (): Promise<string | null> => {
    let token: string | null = null;

    try {
      // Check if Notifications module is available
      if (!Notifications || !Notifications.getExpoPushTokenAsync || !Notifications.getPermissionsAsync) {
        // Warning already shown at module load, no need to repeat
        return null;
      }

      // Check if device is physical (not simulator)
      if (!Device || !Device.isDevice) {
        // If Device module not available, assume it's a device (will fail gracefully if simulator)
        if (!Device) {
          logger.warn('⚠️ expo-device module not available. Assuming physical device.');
        } else {
          logger.warn('⚠️ Push notifications only work on physical devices');
          return null;
        }
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('⚠️ Notification permission not granted');
        return null;
      }

      // Get Expo push token
      // Use project ID from app.json or environment variable
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || 
        Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      
      if (!projectId) {
        logger.warn('⚠️ Expo project ID not found. Push notifications may not work.');
        return null;
      }

      // On Android, Firebase must be initialized for push notifications
      // Check if we're on Android and handle Firebase errors gracefully
      if (Platform.OS === 'android') {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
          });
          token = tokenData.data;
          logger.log('✅ Expo push token obtained:', token);
        } catch (firebaseError: any) {
          // Check if it's a Firebase initialization error
          if (firebaseError?.message?.includes('FirebaseApp') || 
              firebaseError?.message?.includes('Firebase') ||
              firebaseError?.code === 'ERR_NOTIFICATIONS_FCM_NOT_INITIALIZED') {
            logger.warn('⚠️ Firebase not initialized for push notifications. To enable push notifications on Android, follow: https://docs.expo.dev/push-notifications/fcm-credentials/');
            return null;
          }
          // Re-throw other errors
          throw firebaseError;
        }
      } else {
        // iOS - no Firebase required
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = tokenData.data;
        logger.log('✅ Expo push token obtained:', token);
      }

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

      // Register with backend if authenticated
      if (isAuthenticated && user) {
        try {
          await notificationService.registerToken({
            platform: 'expo',
            token,
          });
          logger.log('✅ Push token registered with backend');
        } catch (error: any) {
          logger.error('❌ Failed to register token with backend:', error);
          // Don't throw - token is still valid, just not registered yet
        }
      }

      return token;
    } catch (error: any) {
      // Handle Firebase errors gracefully (especially on Android)
      if (Platform.OS === 'android' && 
          (error?.message?.includes('FirebaseApp') || 
           error?.message?.includes('Firebase') ||
           error?.code === 'ERR_NOTIFICATIONS_FCM_NOT_INITIALIZED')) {
        logger.warn('⚠️ Push notifications require Firebase setup on Android. See: https://docs.expo.dev/push-notifications/fcm-credentials/');
        return null;
      }
      
      // Log other errors but don't crash the app
      logger.error('❌ Error registering for push notifications:', error);
      return null;
    }
  };

  /**
   * Unregister push token
   */
  const unregisterPushToken = async (token: string | null) => {
    if (!token) return;

    try {
      await notificationService.unregisterToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
      setExpoPushToken(null);
      logger.log('✅ Push token unregistered');
    } catch (error: any) {
      logger.error('❌ Error unregistering push token:', error);
    }
  };

  /**
   * Handle notification tap - navigate based on notification data
   */
  const handleNotificationTap = (notification: any) => {
    const data = notification.request.content.data;

    logger.log('🔔 Notification tapped:', data);

    // Navigate based on notification type/data
    const notificationData = data as any;
    if (notificationData?.type) {
      switch (notificationData.type) {
        case 'drill_assigned':
          if (notificationData.drillId) {
            router.push(`/practice/drills/${notificationData.drillId}`);
          } else {
            router.push('/practice/drills');
          }
          break;
        case 'drill_reviewed':
          if (notificationData.drillId) {
            router.push(`/practice/drills/${notificationData.drillId}`);
          } else {
            router.push('/practice/drills');
          }
          break;
        case 'attempt_reviewed':
          if (notificationData.attemptId || notificationData.drillId) {
            router.push('/practice/drills');
          } else {
            router.push('/(tabs)');
          }
          break;
        default:
          // Default navigation
          router.push('/(tabs)');
      }
    } else {
      // No type specified, go to home
      router.push('/(tabs)');
    }
  };

  useEffect(() => {
    // Don't proceed if module is not available
    if (!isModuleAvailable) {
      return;
    }

    let isMounted = true;

    // Check for existing token in storage
    AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY).then((storedToken) => {
      if (storedToken && isMounted) {
        setExpoPushToken(storedToken);
        // Re-register with backend if authenticated
        if (isAuthenticated && user) {
          notificationService.registerToken({
            platform: 'expo',
            token: storedToken,
          }).catch((error) => {
            logger.error('❌ Failed to re-register stored token:', error);
          });
        }
      }
    });

    // Register for push notifications on mount
    registerForPushNotifications().then((token) => {
      if (token && isMounted) {
        setExpoPushToken(token);
      }
    });

    // Listen for notifications received while app is in foreground
    // Only set up listeners if module is available
    try {
      if (Notifications.addNotificationReceivedListener) {
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
          logger.log('🔔 Notification received (foreground):', notification);
          if (isMounted) {
            setNotification(notification);
          }
        });
      }

      // Listen for notification taps
      if (Notifications.addNotificationResponseReceivedListener) {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
          logger.log('🔔 Notification response:', response);
          handleNotificationTap(response.notification);
        });
      }
    } catch (error) {
      logger.warn('⚠️ Failed to set up notification listeners:', error);
    }

    // Cleanup
    return () => {
      isMounted = false;
      try {
        if (notificationListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      } catch (error) {
        logger.warn('⚠️ Error cleaning up notification listeners:', error);
      }
    };
  }, [isModuleAvailable]);

  // Re-register token when user logs in, unregister on logout
  useEffect(() => {
    if (isAuthenticated && user && expoPushToken) {
      // Token already exists, just register with backend
      notificationService.registerToken({
        platform: 'expo',
        token: expoPushToken,
      }).catch((error) => {
        logger.error('❌ Failed to register token after login:', error);
      });
    } else if (!isAuthenticated && expoPushToken) {
      // User logged out, unregister token
      unregisterPushToken(expoPushToken);
    }
  }, [isAuthenticated, user]);

  return {
    expoPushToken,
    notification,
    registerForPushNotifications,
    unregisterPushToken,
  };
}

