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
        // Wait for checkSession to complete if it's running
        // This ensures we have the latest hasProfile from backend
        try {
          await useAuthStore.getState().checkSession();
        } catch (error) {
          logger.warn('Session check failed, using cached user data:', error);
        }

        // Get the latest user from store after checkSession
        const latestUser = useAuthStore.getState().user;
        
        if (latestUser) {
          // hasProfile is now updated from backend via checkSession
          const hasProfile = latestUser.hasProfile === true || 
                             latestUser.role === 'admin' || 
                             latestUser.role === 'tutor';
          
          logger.log('🔍 Profile check (after session refresh):', {
            hasProfile,
            userHasProfile: latestUser.hasProfile,
            role: latestUser.role,
            userId: latestUser.id
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
