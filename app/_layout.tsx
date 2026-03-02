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
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AlertProvider } from "@/contexts/AlertContext";
import { NotificationToastProvider } from "@/contexts/NotificationToastContext";
import { BackgroundPrefetcher } from "@/components/BackgroundPrefetcher";
import * as Updates from "expo-updates";
import * as SystemUI from "expo-system-ui";
import tw from "@/lib/tw";
import { useDeviceContext, useAppColorScheme } from "twrnc";
import { useThemeStore } from "@/store/theme-store";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load selected theme color from store
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();

  // Attach twrnc to the React Native device context so `tw` works everywhere
  useDeviceContext(tw);

  // Control twrnc's color scheme from our theme store (or system when set to "system")
  const [twColorScheme, , setTwColorScheme] = useAppColorScheme(tw);

  useEffect(() => {
    const effectiveTheme =
      theme === "system" ? (systemColorScheme || "light") : theme;

    // Only update twrnc if the desired scheme actually changed to avoid render loops
    if (twColorScheme !== effectiveTheme) {
      setTwColorScheme(effectiveTheme as "light" | "dark");
    }

    // Sync React Native's native Appearance module with our Zustand store
    Appearance.setColorScheme(theme === "system" ? null : theme);

    // Set the system UI background color to match
    SystemUI.setBackgroundColorAsync(
      effectiveTheme === "dark" ? "#171717" : "#ffffff"
    );
  }, [theme, systemColorScheme, twColorScheme, setTwColorScheme]);

  const isDark = (theme === "system" ? systemColorScheme : theme) === "dark";

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

  useEffect(() => {
    // Check for OTA updates on app start
    async function checkForUpdates() {
      if (__DEV__) {
        // Updates are disabled in development
        return;
      }

      try {
        // Add a 5 second timeout to the update check so it doesn't block startup
        const updatePromise = Updates.checkForUpdateAsync();
        const timeoutPromise = new Promise<{isAvailable: boolean}>((_, reject) => {
          setTimeout(() => reject(new Error('Update check timeout')), 5000);
        });
        
        const update = await Promise.race([updatePromise, timeoutPromise]);
        
        if (update.isAvailable) {
          // Add timeout to fetch as well — don't hang indefinitely on slow networks
          const fetchPromise = Updates.fetchUpdateAsync();
          const fetchTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Update fetch timeout')), 15000);
          });
          await Promise.race([fetchPromise, fetchTimeout]);
          // Reload the app to apply the update
          await Updates.reloadAsync();
        }
      } catch {
        // Silently fail - don't block app startup if update check fails or times out
      }
    }

    checkForUpdates();
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AlertProvider>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <NotificationToastProvider>
              <BackgroundPrefetcher />
              <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0d1f0e' : '#2E7D32'} />
                <Stack screenOptions={{ headerShown: false, contentStyle: tw`bg-white dark:bg-neutral-900` }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  {/* First-install onboarding / splash */}
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  {/* Auth flow */}
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  {/* Post-auth profile setup */}
                  <Stack.Screen name="(profile-setup)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="practice" options={{ headerShown: false }} />
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
    </QueryClientProvider>
  );
}
