# Firebase Cloud Messaging (FCM) Setup for Android Push Notifications

## Overview
To enable push notifications on Android, you need to configure Firebase Cloud Messaging (FCM). This guide covers the setup process.

## Prerequisites
- A Firebase account
- Your Expo project ID: `74671476-d20e-46aa-88fb-6dba53dbea27`
- Your Android package name: `com.eklan.ai`

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon (or "Add app")
2. Enter your package name: `com.eklan.ai`
3. Enter app nickname (optional): "Eklan Android"
4. Enter SHA-1 fingerprint (see Step 3)
5. Click "Register app"

## Step 3: Get Your App's SHA-1 Fingerprint

### For Debug Builds:
```bash
cd android
./gradlew signingReport
```

Look for the SHA-1 fingerprint under `Variant: debug` → `SHA1`

### For Release Builds (if you have a keystore):
```bash
keytool -list -v -keystore your-keystore.jks -alias your-key-alias
```

### Alternative (using EAS):
```bash
eas credentials
```

## Step 4: Download google-services.json

1. After registering your Android app, download `google-services.json`
2. **DO NOT** commit this file to git (it's already in `.gitignore`)

## Step 5: Configure EAS Build with FCM Credentials

### Option A: Using EAS Credentials (Recommended)

1. Upload FCM credentials to EAS:
```bash
eas credentials
```

2. Select your project
3. Choose "Android" → "Push Notifications"
4. Upload your `google-services.json` file
5. EAS will automatically use these credentials during builds

### Option B: Manual Setup (For Local Development)

1. Place `google-services.json` in `mobile/android/app/`
2. Make sure `android/app/build.gradle` includes:
```gradle
apply plugin: 'com.google.gms.google-services'
```

3. Make sure `android/build.gradle` includes:
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
}
```

## Step 6: Enable Cloud Messaging API

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Ensure "Cloud Messaging API (Legacy)" is enabled
3. Note your **Server Key** (you'll need this for sending notifications from your backend)

## Step 7: Rebuild Your App

After configuring FCM, rebuild your app:

```bash
# For development build
eas build --platform android --profile development

# For production build
eas build --platform android --profile production
```

## Step 8: Verify Setup

1. Install the rebuilt app on your device
2. The Firebase warning should be gone
3. Push notifications should work

## Troubleshooting

### Warning Still Appears
- Make sure you rebuilt the app after adding FCM credentials
- Verify `google-services.json` is in the correct location
- Check that your package name matches: `com.eklan.ai`

### Push Notifications Not Working
- Verify Cloud Messaging API is enabled in Firebase Console
- Check that your app has notification permissions
- Ensure you're testing on a physical device (not emulator)

## Additional Resources

- [Expo FCM Credentials Guide](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Firebase Console](https://console.firebase.google.com/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)


