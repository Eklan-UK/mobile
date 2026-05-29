/**
 * Dynamic Expo config — extends app.json.
 * Google Sign-In iOS URL scheme: EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME or derived from Web Client ID.
 */
const appJson = require('./app.json');

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function getGoogleIosUrlScheme() {
  const explicit = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  if (explicit) {
    return explicit;
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId || !webClientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    return null;
  }

  const idPart = webClientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length);
  return `com.googleusercontent.apps.${idPart}`;
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
  } else if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    console.warn(
      '[app.config.js] Could not derive iOS Google URL scheme. Set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME or use a Web Client ID ending in .apps.googleusercontent.com'
    );
  }

  return {
    ...expo,
    plugins,
  };
};
