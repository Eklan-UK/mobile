/**
 * Dynamic Expo config — extends app.json.
 *
 * Changing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
 * requires a new native iOS EAS build; eas update cannot update CFBundleURLTypes.
 */
const appJson = require('./app.json');
const {
  getGoogleIosUrlScheme,
  isValidGoogleClientId,
} = require('./config/google-oauth.cjs');

/*
 * Android Google Sign-In: no iosUrlScheme-style plugin option.
 * Native auth uses the Web client ID as webClientId in the SDK; the Android OAuth
 * client in Google Cloud (package com.eklan.ai + SHA-1) must match the signing key.
 */
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
if (androidClientId && !isValidGoogleClientId(androidClientId)) {
  console.warn(
    '[app.config.js] EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is set but does not end with .apps.googleusercontent.com'
  );
}

/** @param {{ config?: import('expo/config').ExpoConfig }} param0 */
module.exports = ({ config }) => {
  const expo = { ...(config ?? appJson.expo) };
  const plugins = [...(expo.plugins ?? [])];

  const iosUrlScheme = getGoogleIosUrlScheme();
  if (iosUrlScheme) {
    const alreadyAdded = plugins.some(
      (p) =>
        (Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin') ||
        p === '@react-native-google-signin/google-signin'
    );
    if (!alreadyAdded) {
      plugins.push([
        '@react-native-google-signin/google-signin',
        { iosUrlScheme },
      ]);
    }
  } else if (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
    console.warn(
      '[app.config.js] Could not derive iOS Google URL scheme from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME or use an iOS Client ID ending in .apps.googleusercontent.com'
    );
  }

  return {
    ...expo,
    // Bare workflow requires an explicit runtime version string (policies are not supported).
    runtimeVersion: expo.version,
    plugins,
  };
};
