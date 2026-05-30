# Native OAuth Setup Guide (Mobile)

This guide explains how to set up native OAuth authentication for the mobile app using Google and Apple Sign-In SDKs.

## Overview

The mobile app now uses **native SDKs** for OAuth authentication instead of web-based OAuth flows:

- **Google**: Uses `@react-native-google-signin/google-signin` SDK
- **Apple**: Uses `expo-apple-authentication` SDK

### Flow

```
User taps "Sign in with Google / Apple"
    ↓
Native SDK opens device account picker
    ↓
SDK returns ID token (NOT access token)
    ↓
App sends ID token → Next.js backend
    ↓
Backend verifies token with Google / Apple
    ↓
Backend creates session / JWT
    ↓
Backend returns app token
    ↓
SecureStore → Auth store → Navigation
```

## Prerequisites

1. Backend server running with the new `/api/v1/auth/verify-id-token` endpoint
2. Google Cloud Console access
3. Apple Developer Portal access (for Apple Sign-In)

## 1. Google OAuth Setup

### Step 1: Get Google Web Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Find or create an **OAuth 2.0 Client ID** of type **Web application**
5. Copy the **Client ID** (it should end with `.apps.googleusercontent.com`)

### Step 2: Create iOS OAuth Client (Google Cloud Console)

1. In **Credentials**, create an **OAuth 2.0 Client ID** of type **iOS**.
2. Set bundle ID to `com.eklan.ai` (must match `app.json`).
3. Copy the **iOS Client ID** (ends with `.apps.googleusercontent.com`).

The reversed client ID becomes your URL scheme, e.g. `com.googleusercontent.apps.XXXX` — `app.config.js` derives this automatically from the iOS client ID unless you set `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` explicitly.

### Step 3: Configure Mobile App

Copy `.env.example` to `.env` and set:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
# Optional override:
# EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.XXXX
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | **Web application** client ID — Android runtime + backend ID token audience |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | **iOS** client ID — native iOS Google Sign-In + URL scheme derivation |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` | Optional override for `CFBundleURLTypes` |

**Important**: `webClientId` in the SDK must be the **Web** client ID (ID token audience). iOS also requires `iosClientId` and a matching URL scheme baked into the native binary.

In `__DEV__`, the app throws at startup if either Google client ID is missing.

### Step 4: Android Configuration

For Android, you also need to configure the app in `app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

Or configure the SHA-1 fingerprint in Google Cloud Console:
1. Get your app's SHA-1 fingerprint: `keytool -list -v -keystore ~/.android/debug.keystore`
2. Add it to your OAuth 2.0 Client ID in Google Cloud Console

### Step 5: iOS Configuration (native rebuild required)

1. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env` and EAS Secrets.
2. `app.config.js` injects `@react-native-google-signin/google-signin` with `iosUrlScheme` derived from the **iOS** client ID (not the Web client ID).
3. Run a **new EAS iOS build** after changing these values — OTA (`eas update`) cannot update `Info.plist` URL schemes:

   ```bash
   eas secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value <ios-client-id>
   eas build --profile development --platform ios
   ```

4. Verify the plugin in generated config:

   ```bash
   npx expo config --type public
   ```

   Look for `@react-native-google-signin/google-signin` with `iosUrlScheme: com.googleusercontent.apps.<ios-prefix>`.

## 2. Apple OAuth Setup

### Step 1: Configure in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Ensure your App ID has **Sign in with Apple** capability enabled
4. Configure your Service ID with return URLs (for web OAuth - not needed for native)

### Step 2: Mobile App Configuration

No additional environment variables needed for Apple Sign-In. The native SDK handles everything.

**Note**: Apple Sign-In is only available on iOS devices.

## 3. Backend Configuration

The backend needs these environment variables (already configured in `front-end/.env`):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
APPLE_CLIENT_ID=com.yourcompany.elkan.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_CONTENT_HERE
-----END PRIVATE KEY-----"
```

## 4. Testing

### Test Google Sign-In

1. Start backend: `cd front-end && yarn dev`
2. Start mobile app: `cd mobile && yarn start`
3. Open app on device/emulator
4. Tap "Continue with Google"
5. Select Google account
6. Verify redirect to app and successful login

### Test Apple Sign-In (iOS only)

1. Start backend and mobile app
2. Open app on iOS device/simulator
3. Tap "Continue with Apple"
4. Sign in with Apple ID
5. Verify redirect to app and successful login

## 5. Troubleshooting

### Google Sign-In Issues

**Error: "No ID token received from Google"**
- Check that `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set correctly
- Verify the Client ID is for a "Web application" type
- Ensure Google Play Services are installed (Android)

**Error: "Google Sign-In is not properly configured" (iOS)**
- Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` to your **iOS** OAuth client ID (not the Web client ID)
- Rebuild the iOS app after changing iOS OAuth env or `app.config.js` (OTA alone is not enough)
- Confirm `npx expo config --type public` shows `@react-native-google-signin/google-signin` with `iosUrlScheme` matching `com.googleusercontent.apps.<ios-client-prefix>`
- Ensure the iOS OAuth client in Google Cloud uses bundle ID `com.eklan.ai`
- Optionally set `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` if automatic derivation fails

**Error: "SIGN_IN_CANCELLED"**
- User cancelled the sign-in - this is normal, not an error

**Error: "Token verification failed"**
- Check backend logs for detailed error
- Verify `GOOGLE_CLIENT_ID` matches the Web Client ID
- Ensure backend endpoint `/api/v1/auth/verify-id-token` is accessible

### Apple Sign-In Issues

**Error: "Apple Sign-In is not available"**
- Only available on iOS devices
- Requires iOS 13+ and device with Apple ID configured

**Error: "No ID token received from Apple"**
- Check device has Apple ID configured
- Verify app has Sign in with Apple capability enabled

### Backend Issues

**Error: "Database connection not available"**
- Check MongoDB connection
- Verify `MONGO_URI` is set correctly

**Error: "Invalid token"**
- Check backend logs for verification errors
- Ensure OAuth credentials are correct

## 6. Differences from Web OAuth

| Aspect | Web OAuth | Native OAuth |
|--------|-----------|--------------|
| User Experience | Browser redirect | Native account picker |
| Token Type | Access token | ID token |
| Speed | Slower (browser) | Faster (native) |
| Offline | No | Yes (cached) |
| Platform | All platforms | Platform-specific |

## 7. Security Notes

1. **ID Tokens**: ID tokens are designed for authentication (not API access)
2. **Token Storage**: Tokens stored in SecureStore (encrypted)
3. **Backend Verification**: All tokens verified server-side
4. **Session Management**: Sessions created in MongoDB via Better Auth

## 8. Migration from Web OAuth

If you were using web-based OAuth before:

1. ✅ Dependencies already installed
2. ✅ Backend endpoint created
3. ✅ Mobile service refactored
4. ⚠️ Update environment variables
5. ⚠️ Test on both platforms

The old web-based OAuth code has been replaced. The new native flow is:
- Faster
- More secure
- Better UX
- Platform-integrated

## Summary

Once configured:
1. ✅ Google Sign-In works on Android and iOS
2. ✅ Apple Sign-In works on iOS
3. ✅ Native account pickers (no browser)
4. ✅ ID tokens verified server-side
5. ✅ Sessions created automatically
6. ✅ Seamless user experience

The native OAuth integration provides a faster, more secure, and better-integrated authentication experience!

