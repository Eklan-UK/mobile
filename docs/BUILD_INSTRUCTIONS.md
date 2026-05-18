# Building APK for Android

This guide will help you build an APK file for your mobile app.

## Prerequisites

1. **EAS CLI** (already installed)
2. **Expo account** - Sign up at https://expo.dev (free tier available)

## Option 1: Build APK using EAS Build (Recommended)

### Step 1: Login to Expo
```bash
cd mobile
npx eas login
```

### Step 2: Configure the project (if not already done)
```bash
npx eas build:configure
```

### Step 3: Build the APK

**For preview/testing (APK):**
```bash
npm run build:android
# or
npx eas build --platform android --profile preview
```

**For production (APK):**
```bash
npm run build:android:prod
# or
npx eas build --platform android --profile production
```

### Step 4: Download the APK
- The build will run on Expo's servers
- You'll get a link to download the APK when it's ready
- The build typically takes 10-20 minutes

## Option 2: Build APK Locally (Requires Android Studio)

### Step 1: Prebuild native code
```bash
cd mobile
npx expo prebuild --platform android
```

### Step 2: Build the APK
```bash
cd android
./gradlew assembleRelease
```

The APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Option 3: Build APK using Expo Development Build

If you need a development build:
```bash
npx eas build --platform android --profile development
```

## Notes

- **Preview profile**: Builds an APK for internal testing
- **Production profile**: Builds an APK optimized for production
- The APK file will be around 50-100MB depending on your app size
- Make sure you have all environment variables set in your `.env` file if needed

## Troubleshooting

If you encounter issues:
1. Make sure you're logged in: `npx eas whoami`
2. Check your app.json configuration
3. Ensure all dependencies are installed: `npm install`
4. For local builds, ensure Android Studio and Android SDK are properly installed





















