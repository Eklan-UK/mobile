import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useColorScheme, Appearance } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AlertProvider } from "@/contexts/AlertContext";
import { NotificationToastProvider } from "@/contexts/NotificationToastContext";
import { BackgroundPrefetcher } from "@/components/BackgroundPrefetcher";
import { ProfileThemeSync } from "@/components/ProfileThemeSync";
import { SubscriptionDeepLinkHandler } from "@/components/subscription/SubscriptionDeepLinkHandler";
import * as Updates from "expo-updates";
import * as SystemUI from "expo-system-ui";
import tw from "@/lib/tw";
import { useDeviceContext, useAppColorScheme } from "twrnc";
import { useThemeStore } from "@/store/theme-store";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { getSemanticColors } from "@/constants/theme-tokens";
import { logger } from "@/utils/logger";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  const updateCheckInFlight = useRef(false);

  useEffect(() => {
    async function checkForUpdates(source: 'startup' | 'foreground') {
      if (__DEV__) return;
      if (!Updates.isEnabled) {
        logger.log('[OTA] expo-updates disabled in this build');
        return;
      }
      if (updateCheckInFlight.current) return;
      updateCheckInFlight.current = true;

      try {
        logger.log('[OTA] Checking for update…', {
          source,
          runtimeVersion: Updates.runtimeVersion,
          channel: Updates.channel,
          updateId: Updates.updateId,
        });

        const update = await Promise.race([
          Updates.checkForUpdateAsync(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Update check timeout')), 20000);
          }),
        ]);

        if (!update.isAvailable) {
          logger.log('[OTA] No update available');
          return;
        }

        logger.log('[OTA] Update available, downloading…');
        await Promise.race([
          Updates.fetchUpdateAsync(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Update fetch timeout')), 45000);
          }),
        ]);

        logger.log('[OTA] Download complete, reloading app');
        await Updates.reloadAsync();
      } catch (e) {
        logger.warn('[OTA] Update check failed (will retry on next launch):', e);
      } finally {
        updateCheckInFlight.current = false;
      }
    }

    void checkForUpdates('startup');

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void checkForUpdates('foreground');
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
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
              <SubscriptionDeepLinkHandler />
              <BackgroundPrefetcher />
              <ProfileThemeSync />
              <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0c0e0d' : '#2E7D32'} />
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
              </ThemeProvider>
              </NotificationToastProvider>
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </AlertProvider>
      </GestureHandlerRootView>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
