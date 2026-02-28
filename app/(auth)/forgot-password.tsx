import { AppText, BoldText, BottomSheet, Button, Input } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { passwordResetService } from "@/services/password-reset.service";
import { Alert } from "@/utils/alert";
import { logger } from "@/utils/logger";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EmailIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await passwordResetService.sendOTP(email);
      logger.log('✅ OTP sent successfully');
      router.push({
        pathname: "/(auth)/forgot-password-sent",
        params: { email },
      });
    } catch (error: any) {
      logger.error('❌ Failed to send OTP:', error);
      const errorMessage = error.message || "Failed to send reset OTP. Please try again.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={tw`flex-1`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "position"}
      >
        <BottomSheet>
          {/* Header */}
          <TouchableOpacity
            onPress={handleBack}
            style={tw`flex-row items-center mb-6`}
          >
            <BackIcon />
            <AppText style={tw`text-base text-neutral-900 ml-1`}>Back</AppText>
          </TouchableOpacity>

          {/* Title */}
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
            Forgot Password?
          </AppText>
          <AppText style={tw`text-base text-neutral-500 mb-8`}>
            Don't worry! Enter your email address and we'll send you a link to reset your password.
          </AppText>

          {/* Email Input */}
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            icon={<EmailIcon />}
            error={error}
          />

          {/* Submit Button */}
          <View style={tw`pt-12 pb-2`}>
            <Button
              onPress={handleSendResetLink}
              loading={loading}
              disabled={!email || loading}
              size="lg"
              style={tw`rounded-full`}
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </View>
        </BottomSheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

