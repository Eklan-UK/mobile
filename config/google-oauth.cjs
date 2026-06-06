const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function isValidGoogleClientId(id) {
  return !!id?.endsWith(GOOGLE_CLIENT_ID_SUFFIX);
}

function clientIdToIosUrlScheme(clientId) {
  if (!isValidGoogleClientId(clientId)) return null;
  return `com.googleusercontent.apps.${clientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length)}`;
}

function getGoogleIosUrlScheme() {
  const explicit = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  if (explicit) return explicit;
  return clientIdToIosUrlScheme(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
  );
}

module.exports = {
  clientIdToIosUrlScheme,
  getGoogleIosUrlScheme,
  GOOGLE_CLIENT_ID_SUFFIX,
  isValidGoogleClientId,
};
