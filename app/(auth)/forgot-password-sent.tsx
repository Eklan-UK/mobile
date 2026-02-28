import { AppText, BoldText, BottomSheet, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

function CheckIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#2E7D32" />
      <Path
        d="M9 12l2 2 4-4"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ForgotPasswordSentScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const handleBackToLogin = () => {
    router.replace("/(auth)/auth");
  };

  return (
    <SafeAreaView style={tw`flex-1`} edges={["top", "bottom"]}>
      <BottomSheet>
        {/* Success Icon */}
        <View style={tw`items-center mb-6`}>
          <CheckIcon />
        </View>

        {/* Title */}
        <AppText style={tw`text-2xl font-bold text-neutral-900 mb-2 text-center`}>
          Check your email
        </AppText>
        <AppText style={tw`text-base text-neutral-500 mb-8 text-center`}>
          We've sent a password reset link to{" "}
          <AppText style={tw`text-neutral-900 font-medium`}>{email}</AppText>
        </AppText>

        {/* Instructions */}
        <View style={tw`bg-neutral-50 rounded-xl p-4 mb-8`}>
          <AppText style={tw`text-sm text-neutral-600 text-center`}>
            Click the link in the email to reset your password. If you don't see it, check your spam folder.
          </AppText>
        </View>

        {/* Back Button */}
        <View style={tw`pb-2`}>
          <Button
            onPress={handleBackToLogin}
            size="lg"
            style={tw`rounded-full`}
          >
            Back to Login
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

