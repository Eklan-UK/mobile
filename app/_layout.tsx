import { useFonts } from "expo-font";
import { Stack } from "expo-router";
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
import { BackgroundPrefetcher } from "@/components/BackgroundPrefetcher";
import * as Updates from "expo-updates";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Initialize push notifications
  usePushNotifications();

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
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Reload the app to apply the update
          await Updates.reloadAsync();
        }
      } catch (error) {
        // Silently fail - don't block app startup if update check fails
        console.log("Update check failed:", error);
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
              <BackgroundPrefetcher />
              <StatusBar style="dark" backgroundColor="#2E7D32" />
              <Stack screenOptions={{ headerShown: false }}>
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
                  name="notifications-permission"
                  options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                  }}
                />
              </Stack>
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </AlertProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
