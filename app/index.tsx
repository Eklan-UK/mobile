import { useEffect, useRef } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import tw from "@/lib/tw";
import { useAuthStore } from "@/store/auth-store";
import { logger } from "@/utils/logger";

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
          useAuthStore.getState().checkSession().catch((error) => {
            logger.warn("Background session check failed:", error);
          });

          const cachedUser = useAuthStore.getState().user;

          if (cachedUser) {
            const hasProfile =
              cachedUser.hasProfile === true ||
              cachedUser.role === "admin" ||
              cachedUser.role === "tutor";
            const emailVerified =
              cachedUser.emailVerified === true ||
              cachedUser.isEmailVerified === true;

            logger.log("🔍 Profile check (cached):", {
              hasProfile,
              userHasProfile: cachedUser.hasProfile,
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
