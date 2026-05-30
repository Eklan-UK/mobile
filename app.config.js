/**
 * Dynamic Expo config — extends app.json.
 *
 * Changing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
 * requires a new native iOS EAS build; eas update cannot update CFBundleURLTypes.
 */
const appJson = require('./app.json');
const { getGoogleIosUrlScheme } = require('./config/google-oauth.cjs');

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
    plugins,
  };
};
