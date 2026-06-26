import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useColorScheme, Appearance } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { BadgeUnlockProvider } from "@/contexts/BadgeUnlockContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { NotificationToastProvider } from "@/contexts/NotificationToastContext";
import { BackgroundPrefetcher } from "@/components/BackgroundPrefetcher";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { ProfileThemeSync } from "@/components/ProfileThemeSync";
import { SubscriptionDeepLinkHandler } from "@/components/subscription/SubscriptionDeepLinkHandler";
import { OtaUpdateCoordinator } from "@/components/OtaUpdateCoordinator";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { initGlobalErrorHandlers } from "@/lib/global-error-handlers";
import * as SystemUI from "expo-system-ui";
import tw from "@/lib/tw";
import { useDeviceContext, useAppColorScheme } from "twrnc";
import { useThemeStore } from "@/store/theme-store";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { getSemanticColors } from "@/constants/theme-tokens";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://0f8768ee1dd6787b9181b4d80a1e1d3c@o4511512667619328.ingest.de.sentry.io/4511621819138128',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

initGlobalErrorHandlers();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  // Load selected theme color from store
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();

  // Attach twrnc to RN device context. With options, twrnc skips overwriting our color
  // scheme on every render (otherwise useColorScheme() fights Zustand + causes an infinite loop).
  useDeviceContext(tw, {
    observeDeviceColorSchemeChanges: false,
    initialColorScheme: "device",
  });

  // Control twrnc's color scheme from our theme store (or system when set to "system")
  const [, , setTwColorScheme] = useAppColorScheme(tw);

  useEffect(() => {
    const effectiveTheme =
      theme === "system" ? (systemColorScheme || "light") : theme;

    // Compare against tw instance so we don't depend on twColorScheme + unstable setter identity
    if (tw.getColorScheme() !== effectiveTheme) {
      setTwColorScheme(effectiveTheme as "light" | "dark");
    }

    // Sync React Native's native Appearance module with our Zustand store
    Appearance.setColorScheme(theme === "system" ? null : theme);

    // Set the system UI background color to match web `--background`
    const surface = getSemanticColors(effectiveTheme === "dark" ? "dark" : "light").background;
    SystemUI.setBackgroundColorAsync(surface);
    // setTwColorScheme from twrnc is not referentially stable; omit to avoid running this effect every render.
  }, [theme, systemColorScheme]);

  const isDark = (theme === "system" ? systemColorScheme : theme) === "dark";
  const stackSurface = getSemanticColors(isDark ? "dark" : "light").background;

  const [fontsLoaded, fontError] = useFonts({
    // Nunito - for headers
    "Nunito-Regular": require("@/assets/fonts/Nunito/static/Nunito-Regular.ttf"),
    "Nunito-Medium": require("@/assets/fonts/Nunito/static/Nunito-Medium.ttf"),
    "Nunito-SemiBold": require("@/assets/fonts/Nunito/static/Nunito-SemiBold.ttf"),
    "Nunito-Bold": require("@/assets/fonts/Nunito/static/Nunito-Bold.ttf"),
    "Nunito-ExtraBold": require("@/assets/fonts/Nunito/static/Nunito-ExtraBold.ttf"),
    "Nunito-Black": require("@/assets/fonts/Nunito/static/Nunito-Black.ttf"),
    "Nunito-Light": require("@/assets/fonts/Nunito/static/Nunito-Light.ttf"),
    "Nunito-ExtraLight": require("@/assets/fonts/Nunito/static/Nunito-ExtraLight.ttf"),
    // Satoshi - for body text
    "Satoshi-Regular": require("@/assets/fonts/satoshi/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("@/assets/fonts/satoshi/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("@/assets/fonts/satoshi/Satoshi-Bold.otf"),
    "Satoshi-Black": require("@/assets/fonts/satoshi/Satoshi-Black.otf"),
    "Satoshi-Light": require("@/assets/fonts/satoshi/Satoshi-Light.otf"),
  });

  const appShellReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (appShellReady) {
      SplashScreen.hideAsync();
    }
  }, [appShellReady]);

  if (!appShellReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AlertProvider>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <NotificationToastProvider>
              <BadgeUnlockProvider>
              <OtaUpdateCoordinator appShellReady={appShellReady} />
              <SubscriptionDeepLinkHandler />
              <BackgroundPrefetcher />
              <PushNotificationManager />
              <ProfileThemeSync />
              <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0c0e0d' : '#2E7D32'} />
                <RootErrorBoundary>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: stackSurface } }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  {/* First-install onboarding / splash */}
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  {/* Auth flow */}
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  {/* Post-auth profile setup */}
                  <Stack.Screen name="(profile-setup)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="practice" options={{ headerShown: false }} />
                  <Stack.Screen name="sessions" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                  <Stack.Screen name="lesson" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="notifications"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="notifications-permission"
                    options={{
                      presentation: "modal",
                      animation: "slide_from_bottom",
                    }}
                  />
                </Stack>
                </RootErrorBoundary>
              </ThemeProvider>
              </BadgeUnlockProvider>
              </NotificationToastProvider>
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </AlertProvider>
      </GestureHandlerRootView>
      </LanguageProvider>
    </QueryClientProvider>
  );
});
