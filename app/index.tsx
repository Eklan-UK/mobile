import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import tw from "@/lib/tw";
import { useAuthStore } from "@/store/auth-store";
import { logger } from "@/utils/logger";

export default function RootSplashRouter() {
  // Get user directly from auth store (already has hasProfile from login)
  const { isAuthenticated, hasHydrated, hydrate, user } = useAuthStore();

  useEffect(() => {
    // Hydrate auth state from storage
    hydrate();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const checkAuthAndRoute = async () => {
      // Wait a bit for splash animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (isAuthenticated) {
        // Fire and forget session check - don't block navigation
        useAuthStore.getState().checkSession().catch(error => {
          logger.warn('Background session check failed:', error);
        });

        // Use cached user data immediately for fast startup
        const cachedUser = useAuthStore.getState().user;
        
        if (cachedUser) {
          const hasProfile = cachedUser.hasProfile === true || 
                             cachedUser.role === 'admin' || 
                             cachedUser.role === 'tutor';
          
          logger.log('🔍 Profile check (cached):', {
            hasProfile,
            userHasProfile: cachedUser.hasProfile,
            role: cachedUser.role,
            userId: cachedUser.id
          });
          
          if (hasProfile) {
            logger.log('🏠 Navigating to main app (hasProfile: true)');
            router.replace("/(tabs)");
          } else {
            logger.log('🚀 Navigating to profile setup (hasProfile: false)');
            router.replace("/(profile-setup)");
          }
        } else {
          // No user data, go to profile setup as fallback
          logger.log('⚠️ No user data in store, navigating to profile setup');
          router.replace("/(profile-setup)");
        }
      } else {
        // Not authenticated, show onboarding
        logger.log('🔓 Not authenticated, navigating to onboarding');
        router.replace("/(onboarding)/splash");
      }
    };

    checkAuthAndRoute();
  }, [isAuthenticated, hasHydrated]); // Removed user from dependencies to avoid re-running on every user update

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
