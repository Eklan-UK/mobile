import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import Logo from "@/assets/icons/logo.svg";
import { secureStorage } from "@/lib/secure-storage";
import { useAuthStore } from "@/store/auth-store";
import { logger } from "@/utils/logger";
import apiClient from "@/lib/api";
import { FormData } from "./steps/types";

function CloverIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 100 100" fill="none">
      <Circle cx={30} cy={30} r={20} fill="#10B981" />
      <Circle cx={70} cy={30} r={20} fill="#10B981" />
      <Circle cx={30} cy={70} r={20} fill="#10B981" />
      <Circle cx={70} cy={70} r={20} fill="#10B981" />
      <Circle cx={50} cy={50} r={15} fill="#10B981" />
    </Svg>
  );
}

function MicIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
        fill="white"
        stroke="white"
        strokeWidth={2}
      />
      <Path
        d="M19 10v2a7 7 0 01-14 0v-2"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 19v4M8 23h8"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function WelcomeCompleteScreen() {
  const params = useLocalSearchParams<{
    name?: string;
  }>();

  const handleStartConversation = async () => {
    await updateUserProfileAndNavigate();
  };

  const handleExploreDashboard = async () => {
    await updateUserProfileAndNavigate();
  };

  const updateUserProfileAndNavigate = async () => {
    try {
      // Get profile setup data from storage
      const profileDataJson = await secureStorage.getItem('profileSetupData');
      if (!profileDataJson) {
        logger.warn('⚠️ No profile setup data found, proceeding with local update only');
        await secureStorage.setOnboardingComplete(true);
        router.replace("/(tabs)");
        return;
      }

      const profileData: FormData = JSON.parse(profileDataJson);
      
      // Map mobile form data to backend schema
      const mapRoleToUserType = (role: string): 'professional' | 'student' | 'browsing' | 'ancestor' => {
        switch (role) {
          case 'professional':
            return 'professional';
          case 'student':
            return 'student';
          case 'exploring':
            return 'browsing';
          default:
            return 'browsing';
        }
      };

      const onboardPayload: any = {
        userType: mapRoleToUserType(profileData.role),
        learningGoal: profileData.goal,
        nationality: profileData.nationality,
      };

      // Call backend onboarding endpoint
      logger.log('📡 Sending profile data to backend...', onboardPayload);
      const response = await apiClient.post('/api/v1/users/onboard', onboardPayload);
      
      logger.log('✅ Backend onboarding successful:', response.data);

      // Clean up stored profile data
      await secureStorage.removeItem('profileSetupData');

      // Mark local onboarding as complete
      await secureStorage.setOnboardingComplete(true);
      
      // Refresh user data from backend to get updated hasProfile
      logger.log('🔄 Refreshing user data from backend...');
      await useAuthStore.getState().checkSession();
      
      // Verify hasProfile is now true
      const refreshedUser = useAuthStore.getState().user;
      if (refreshedUser) {
        const hasProfile = refreshedUser.hasProfile === true || 
                          refreshedUser.role === 'admin' || 
                          refreshedUser.role === 'tutor';
        
        logger.log('✅ User data refreshed:', { 
          hasProfile, 
          userId: refreshedUser.id,
          role: refreshedUser.role 
        });
        
        if (!hasProfile) {
          logger.warn('⚠️ hasProfile is still false after onboarding. Backend may not have updated yet.');
        }
      }
      
      router.replace("/(tabs)");
    } catch (error: any) {
      logger.error('❌ Error updating user profile:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });
      
      // Still mark local onboarding as complete and navigate
      // The backend will handle hasProfile on next login
      await secureStorage.setOnboardingComplete(true);
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <View style={tw`flex-1 px-6 pt-8 items-center justify-center`}>
        {/* Clover Icon with confetti effect */}
        <View style={tw`items-center mb-6`}>
          <View style={tw`relative`}>
            <Logo />
          </View>
        </View>

        {/* Welcome Message */}
        <BoldText style={tw`text-3xl font-bold text-neutral-900 text-center mb-2`}>
          Welcome, {params.name || "Amy"}!
        </BoldText>
        <AppText style={tw`text-base text-neutral-500 text-center mb-8`}>
          ✨ You're now a budding speaker
        </AppText>

        {/* Recommendation Card */}
        <View style={tw`bg-white rounded-3xl p-6 border-2 border-dashed border-neutral-300 mb-8 w-full`}>
          <View style={tw`items-center mb-4`}>
            <View style={tw`w-24 h-24 rounded-full border-4 border-red-500 items-center justify-center mb-4`}>
              <BoldText style={tw`text-3xl font-bold text-red-500`}>12</BoldText>
              <AppText style={tw`text-xs text-neutral-500`}>minutes</AppText>
            </View>
          </View>
          
          <AppText style={tw`text-center text-neutral-600 text-sm`}>
            Based on your voice, we recommend starting with 12 minutes a day.
          </AppText>
        </View>

        {/* Spacer */}
        <View style={tw`flex-1`} />

        {/* Action Buttons */}
        <View style={tw`gap-3 pb-4 w-full`}>
          <Button
            onPress={handleStartConversation}
            icon={<MicIcon />}
            size="lg"
            style={tw`rounded-full`}
          >
            Start my first conversation
          </Button>
          <Button
            variant="secondary"
            size="lg"
            style={tw`rounded-full border-2 border-neutral-200`}
            onPress={handleExploreDashboard}
          >
            Explore Dashboard First
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
