import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import apiClient from '@/lib/api';
import { secureStorage } from '@/lib/secure-storage';
import { logger } from "@/utils/logger";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Configure Google Sign-In
// Note: webClientId should be your Google OAuth Web Client ID from Google Cloud Console
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (!webClientId) {
  logger.error('⚠️ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Google Sign-In will not work.');
} else {
  GoogleSignin.configure({
    webClientId: webClientId, // From Google Cloud Console
    offlineAccess: false, // We only need ID token, not access token
    forceCodeForRefreshToken: false,
  });
  logger.log('✅ Google Sign-In configured with webClientId');
}

export interface OAuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    emailVerified?: boolean;
    hasProfile?: boolean; // Backend flag: true when user has completed profile/onboarding
    role?: string; // User role (admin, tutor, user)
  };
  session: {
    token: string;
    expiresAt: number;
    userId: string;
  };
  token: string;
}

/**
 * Sign in with Google using native SDK
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    logger.log('🔵 Google OAuth: Starting native flow...');

    // Check if running in Expo Go (which doesn't support native modules)
    if (Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient') {
      // This might be Expo Go - check app ownership
      const isExpoGo = Constants.appOwnership === 'expo' || 
                       !Constants.expoConfig?.android?.package ||
                       Constants.expoConfig?.android?.package === 'host.exp.exponent';
      
      if (isExpoGo) {
        const errorMsg = 'Google Sign-In requires a development build. Expo Go does not support native Google Sign-In. Please build and run a development build using "npx expo run:android" or create a build with "eas build --profile development --platform android".';
        logger.error('❌ ' + errorMsg);
        throw new Error(errorMsg);
      }
    }

    // Verify configuration
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      const errorMsg = 'Google OAuth is not configured. EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.';
      logger.error('❌ ' + errorMsg);
      throw new Error(errorMsg);
    }
    
    // Verify webClientId format (should be a Google OAuth 2.0 Client ID)
    if (!webClientId.includes('.apps.googleusercontent.com')) {
      logger.warn('⚠️ webClientId does not appear to be a valid Google OAuth 2.0 Client ID format');
    }
    
    logger.log('🔍 Google Sign-In configuration:', {
      webClientIdPrefix: webClientId.substring(0, 20) + '...',
      webClientIdLength: webClientId.length,
      platform: Platform.OS,
    });

    // Check if Google Play Services are available (Android)
    if (Platform.OS === 'android') {
      try {
        // Add a small delay to ensure activity context is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const hasPlayServices = await GoogleSignin.hasPlayServices({ 
          showPlayServicesUpdateDialog: true 
        });
        logger.log('📱 Google Play Services available:', hasPlayServices);
      } catch (playServicesError: any) {
        logger.error('❌ Google Play Services error:', playServicesError);
        
        // Check for specific error types
        if (playServicesError.message?.includes('Current activity is null') || 
            playServicesError.message?.includes('activity is null')) {
          const errorMsg = 'Google Sign-In requires a development build. Expo Go does not support native Google Sign-In. Please build and run a development build using "npx expo run:android" or "eas build".';
          logger.error('❌ ' + errorMsg);
          throw new Error(errorMsg);
        }
        
        throw new Error('Google Play Services is required for Google Sign-In. Please install or update Google Play Services.');
      }
    }

    // Always sign out first to ensure a fresh sign-in and show the account picker
    // This prevents issues where signIn() returns cached data without an ID token
    try {
      await GoogleSignin.signOut();
      logger.log('🧹 Cleared any existing Google sign-in session');
    } catch (signOutError) {
      // Ignore sign-out errors, continue with sign-in
      logger.log('⚠️ Could not sign out (this is okay, continuing):', signOutError);
    }

    // Sign in with Google (fresh sign-in)
    logger.log('🔵 Starting fresh Google sign-in...');
    let userInfo;
    try {
      // Add a small delay to ensure activity context is ready (Android)
      if (Platform.OS === 'android') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      userInfo = await GoogleSignin.signIn();
    } catch (signInError: any) {
      // Handle cancellation explicitly
      if (
        signInError.code === 'SIGN_IN_CANCELLED' ||
        signInError.code === '12501' ||
        signInError.code === '10' ||
        signInError.message?.includes('cancelled') ||
        signInError.message?.includes('canceled')
      ) {
        logger.log('⚠️ Google sign-in was cancelled by user');
        throw new Error('Google sign-in was cancelled');
      }
      
      // Handle activity null error
      if (signInError.message?.includes('Current activity is null') || 
          signInError.message?.includes('activity is null')) {
        const errorMsg = 'Google Sign-In requires a development build. Expo Go does not support native Google Sign-In. Please build and run a development build using "npx expo run:android" or "eas build".';
        logger.error('❌ ' + errorMsg);
        throw new Error(errorMsg);
      }
      
      throw signInError;
    }
    
    // Extract data from response - the response structure is { type: "success", data: { idToken, user, ... } }
    const signInData = userInfo?.data || userInfo;
    
    // Log the full response structure for debugging
    logger.log('📥 Google Sign-In response received', {
      hasUserInfo: !!userInfo,
      hasData: !!signInData,
      hasIdToken: !!signInData?.idToken,
      hasUser: !!signInData?.user,
      hasServerAuthCode: !!signInData?.serverAuthCode,
      userEmail: signInData?.user?.email,
      responseKeys: userInfo ? Object.keys(userInfo) : [],
      dataKeys: signInData ? Object.keys(signInData) : [],
    });
    
    if (!userInfo || !signInData) {
      throw new Error('Google sign-in returned no user information. The sign-in may have been cancelled.');
    }
    
    // Check for cancellation or missing ID token
    if (!signInData.idToken) {
      // Check if this is a cancellation (no user data)
      if (!signInData.user || signInData.user === null || signInData.user === undefined) {
        logger.log('⚠️ Google sign-in was cancelled by user (no user data)');
        throw new Error('Google sign-in was cancelled');
      }
      
      // Try to get tokens if we have a user but no ID token
      // This can happen if the webClientId is not properly configured
      logger.log('⚠️ No ID token in sign-in response, attempting to get tokens...');
      try {
        const tokens = await GoogleSignin.getTokens();
        if (tokens.idToken) {
          logger.log('✅ Got ID token via getTokens()');
          signInData.idToken = tokens.idToken;
        } else {
          logger.error('❌ getTokens() also returned no ID token', {
            hasIdToken: !!tokens.idToken,
            hasAccessToken: !!tokens.accessToken,
            tokensKeys: Object.keys(tokens),
          });
        }
      } catch (tokenError: any) {
        logger.error('❌ Failed to get tokens:', {
          error: tokenError.message,
          code: tokenError.code,
        });
      }
      
      // If we still don't have an ID token, it's a configuration issue
      if (!signInData.idToken) {
        logger.error('Google sign-in failed: No ID token received', {
          userInfo: {
            user: signInData.user?.email,
            hasIdToken: !!signInData.idToken,
            hasAccessToken: !!signInData.serverAuthCode,
          },
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ? 'configured' : 'missing',
          suggestion: 'This usually means the webClientId is incorrect or the SHA-1 fingerprint is not registered in Google Cloud Console',
        });
        
        throw new Error('No ID token received from Google. Please verify that EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set correctly and matches your Google Cloud Console OAuth 2.0 Web Client ID. Also ensure your app\'s SHA-1 fingerprint is registered in Google Cloud Console.');
      }
    }
    
    // Use the extracted data
    const idToken = signInData.idToken;
    const googleUser = signInData.user;

    logger.log('✅ Google ID token received', {
      userEmail: googleUser?.email,
      userId: googleUser?.id,
    });

    // Send ID token to backend for verification
    logger.log('📡 Sending ID token to backend...');
    const response = await apiClient.post('/api/v1/auth/verify-id-token', {
      idToken: idToken,
      provider: 'google',
    });

    const { user, token, session } = response.data?.data || response.data;

    if (!user || !token) {
      throw new Error('Invalid response from backend');
    }

    logger.log('✅ Backend verified ID token, user:', user.email);

    // Store credentials
    await secureStorage.setToken(token);
    await secureStorage.setUser(user);

    // Extract hasProfile from user object
    const hasProfile = user.hasProfile === true || 
                       user.role === 'admin' || 
                       user.role === 'tutor';

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatar: user.avatar,
        emailVerified: user.emailVerified !== undefined ? user.emailVerified : true,
        hasProfile,
        role: user.role,
      },
      session: session || {
        token: token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        userId: user.id,
      },
      token: token,
    };
  } catch (error: any) {
    // Handle cancellation errors
    if (
      error.code === 'SIGN_IN_CANCELLED' || 
      error.code === '12501' ||
      error.code === '10' || // SIGN_IN_CANCELLED on Android
      error.message?.includes('cancelled') ||
      error.message?.includes('canceled')
    ) {
      logger.log('⚠️ User cancelled Google sign-in');
      throw new Error('Google sign-in was cancelled');
    }

    // Handle configuration errors
    if (error.message?.includes('configuration') || error.message?.includes('configure')) {
      logger.error('❌ Google OAuth configuration error:', {
        message: error.message,
        code: error.code,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ? 'set' : 'missing',
      });
      throw new Error('Google Sign-In is not properly configured. Please contact support.');
    }

    logger.error('❌ Google OAuth error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Sign in with Apple using native SDK
 */
export async function signInWithApple(): Promise<OAuthResult> {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    logger.log('🔵 Apple OAuth: Starting native flow...');

    // Request credential (ID token)
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No ID token received from Apple');
    }

    logger.log('✅ Apple ID token received');

    // Send ID token to backend for verification
    logger.log('📡 Sending ID token to backend...');
    const response = await apiClient.post('/api/v1/auth/verify-id-token', {
      idToken: credential.identityToken,
      provider: 'apple',
      // Apple provides name only on first sign-in
      firstName: credential.fullName?.givenName,
      lastName: credential.fullName?.familyName,
    });

    const { user, token, session } = response.data?.data || response.data;

    if (!user || !token) {
      throw new Error('Invalid response from backend');
    }

    logger.log('✅ Backend verified ID token, user:', user.email);

    // Store credentials
    await secureStorage.setToken(token);
    await secureStorage.setUser(user);

    // Extract hasProfile from user object
    const hasProfile = user.hasProfile === true || 
                       user.role === 'admin' || 
                       user.role === 'tutor';

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || credential.fullName?.givenName || '',
        lastName: user.lastName || credential.fullName?.familyName || '',
        avatar: user.avatar,
        emailVerified: user.emailVerified !== undefined ? user.emailVerified : true,
        hasProfile,
        role: user.role,
      },
      session: session || {
        token: token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        userId: user.id,
      },
      token: token,
    };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED' || error.code === 1001) {
      logger.log('⚠️ User cancelled Apple sign-in');
      throw new Error('Apple sign-in was cancelled');
    }

    logger.error('❌ Apple OAuth error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Check if Apple Sign-In is available
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Sign out from Google (optional - for cleanup)
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    logger.error('Google sign-out error:', error);
    // Don't throw - this is optional cleanup
  }
}
