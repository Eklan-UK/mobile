import { useEffect, useRef } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import tw from "@/lib/tw";
import { useAuthStore } from "@/store/auth-store";
import { logger } from "@/utils/logger";
import { resolveEmailVerified, resolveHasProfile } from "@/utils/auth-profile";

/** Max wait for session refresh on launch so offline verified users are not blocked forever. */
const SESSION_REFRESH_TIMEOUT_MS = 3000;

async function refreshSessionWithTimeout(): Promise<void> {
  await Promise.race([
    useAuthStore.getState().checkSession(),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Session refresh timeout")),
        SESSION_REFRESH_TIMEOUT_MS
      );
    }),
  ]);
}

export default function RootSplashRouter() {
  const { isAuthenticated, hasHydrated, hydrate } = useAuthStore();
  const hydrateStarted = useRef(false);

  useEffect(() => {
    if (hydrateStarted.current) return;
    hydrateStarted.current = true;

    void hydrate().catch((error) => {
      logger.error("Hydrate failed:", error);
    });
  }, [hydrate]);

  useEffect(() => {
    if (!hasHydrated) return;

    const checkAuthAndRoute = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (isAuthenticated) {
          try {
            await refreshSessionWithTimeout();
          } catch (error) {
            logger.warn("Session refresh before routing failed:", error);
          }

          const cachedUser = useAuthStore.getState().user;

          if (cachedUser) {
            const hasProfile = resolveHasProfile(cachedUser);
            const emailVerified = resolveEmailVerified(cachedUser);

            logger.log("🔍 Profile check (cached):", {
              hasProfile,
              userHasProfile: cachedUser.hasProfile,
              emailVerified,
              role: cachedUser.role,
              userId: cachedUser.id,
            });

            if (!emailVerified) {
              logger.log("📧 Email not verified, navigating to verify-email auth flow");
              router.replace("/(auth)/auth?mode=verify-email");
              return;
            }

            if (hasProfile) {
              logger.log("🏠 Navigating to main app (hasProfile: true)");
              router.replace("/(tabs)");
            } else {
              logger.log("🚀 Navigating to profile setup (hasProfile: false)");
              router.replace("/(profile-setup)");
            }
          } else {
            logger.log("⚠️ No user data in store, navigating to profile setup");
            router.replace("/(profile-setup)");
          }
        } else {
          logger.log("🔓 Not authenticated, navigating to onboarding");
          router.replace("/(onboarding)/splash");
        }
      } catch (error) {
        logger.error("Auth routing failed:", error);
        router.replace("/(onboarding)/splash");
      }
    };

    void checkAuthAndRoute();
  }, [isAuthenticated, hasHydrated]);

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <View style={tw`flex-1 items-center justify-center`}>
        <LottieView
          source={require("@/assets/animations/splash.json")}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
      </View>
    </SafeAreaView>
  );
}
