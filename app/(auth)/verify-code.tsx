import { AppText, BoldText, BottomSheet, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const CODE_LENGTH = 6;

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input
    inputRefs.current[0]?.focus();

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const pastedCode = text.slice(0, CODE_LENGTH).split("");
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      const lastIndex = Math.min(index + pastedCode.length, CODE_LENGTH - 1);
      inputRefs.current[lastIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      setError("");

      // Move to next input
      if (text && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== CODE_LENGTH) {
      setError("Please enter the complete verification code");
      return;
    }

    setLoading(true);
    setError("");

    // TODO: API call to verify code
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);

    // Navigate to profile setup or main app
    router.replace("/(profile-setup)/name");
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    // TODO: API call to resend code
    setCountdown(60);
  };

  const handleBack = () => {
    router.back();
  };

  const isComplete = code.every((c) => c !== "");

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
          <AppText style={tw`text-base text-neutral-900 dark:text-white ml-1`}>Back</AppText>
        </TouchableOpacity>

        {/* Title */}
        <AppText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-2`}>
          Enter verification code
        </AppText>
        <AppText style={tw`text-base text-neutral-500 dark:text-neutral-400 mb-8`}>
          We sent a code to{" "}
          <AppText style={tw`text-neutral-900 dark:text-neutral-200 font-medium`}>{email}</AppText>
        </AppText>

        {/* Code Input */}
        <View style={tw`flex-row justify-between mb-4`}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref: any) => (inputRefs.current[index] = ref)}
              style={tw`w-12 h-14 border ${error ? "border-error" : digit ? "border-primary-500" : "border-neutral-200 dark:border-neutral-700"} rounded-2xl text-center text-xl font-semibold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800`}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </View>

        {error && <AppText style={tw`text-error text-sm mb-4`}>{error}</AppText>}

        {/* Resend */}
        <View style={tw`flex-row items-center justify-center mb-10`}>
          <AppText style={tw`text-neutral-500 dark:text-neutral-400`}>Didn't receive the code? </AppText>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <AppText
              style={tw`${countdown > 0 ? "text-neutral-400" : "text-primary-500"} font-medium`}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <View style={tw`pb-2`}>
          <Button
            onPress={handleVerify}
            loading={loading}
            disabled={!isComplete}
            size="lg"
            style={tw`rounded-full`}
          >
            Verify
          </Button>
        </View>
        </BottomSheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
