export const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

/** Web application OAuth client ID — used for ID token audience (Android + backend). */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined;

/** iOS OAuth client ID — required for native Google Sign-In on iOS. */
export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined;

export function clientIdToIosUrlScheme(
  clientId: string | undefined
): string | null {
  if (!clientId?.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) return null;
  return `com.googleusercontent.apps.${clientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length)}`;
}

export function getGoogleIosUrlScheme(): string | null {
  const explicit = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  if (explicit) return explicit;
  return clientIdToIosUrlScheme(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
  );
}

/** Resolved iOS URL scheme for Info.plist (explicit env or derived from iOS client ID). */
export const GOOGLE_IOS_URL_SCHEME = getGoogleIosUrlScheme();

/**
 * Fail fast in development when Google OAuth env is incomplete.
 * Production builds do not throw (Android-only QA); iOS sign-in fails with a targeted error.
 */
export function assertGoogleOAuthEnvForDev(): void {
  if (!__DEV__) return;

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required for Google Sign-In. Add it to .env and EAS secrets, then create a new native build.'
    );
  }

  if (!GOOGLE_IOS_CLIENT_ID) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is required for iOS Google Sign-In. Add it to .env and EAS secrets, then create a new iOS native build.'
    );
  }
}
