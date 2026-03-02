import { AppText, BoldText, Button, Input } from "@/components/ui";
import tw from "@/lib/tw";
import { useState, useEffect } from "react";
import { KeyboardAvoidingView, Platform, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { StepProps } from "./types";
import { useAuthStore } from "@/store/auth-store";

function BackArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#1F2937"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke="#737373" strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            tw`h-2 rounded-full`,
            i < current
              ? tw`w-2 bg-green-400`
              : i === current
                ? tw`w-8 bg-green-700`
                : tw`w-2 bg-gray-200`,
          ]}
        />
      ))}
    </View>
  );
}

export default function NameStep({ data, onUpdate, onNext, onBack, isFirst, currentStep, totalSteps }: StepProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // Prefill name from user account if not already set
  useEffect(() => {
    if (!data.name && user) {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      if (fullName) {
        onUpdate({ name: fullName });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data.name]);

  const handleContinue = async () => {
    if (!data.name.trim()) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLoading(false);
    onNext();
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <View style={tw`flex-1 px-6 pt-5`}>
          {/* Header with back button and progress */}
          <View style={tw`flex-row items-center mb-8`}>
            {!isFirst && (
              <TouchableOpacity
                onPress={onBack}
                style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
              >
                <BackArrowIcon />
              </TouchableOpacity>
            )}
            <View style={tw`flex-1 items-center`}>
              <ProgressDots current={currentStep} total={totalSteps} />
            </View>
          </View>

          {/* Title */}
          <BoldText style={tw`text-2xl text-gray-900 mb-2`}>
            Confirm your name
          </BoldText>
          <AppText style={tw`text-base text-gray-500 mb-6`}>
            What should we call you?
          </AppText>

          {/* Name Input */}
          <Input
            placeholder="Enter your name"
            value={data.name}
            onChangeText={(name) => onUpdate({ name })}
            autoCapitalize="words"
            autoComplete="name"
            icon={<UserIcon />}
          />

          {/* Spacer */}
          <View style={tw`flex-1`} />

          {/* Continue Button */}
          <View style={tw`mb-2`}>
            <Button
              onPress={handleContinue}
              loading={loading}
              disabled={!data.name.trim()}
              size="lg"
              style={tw`rounded-full bg-green-700`}
            >
              Continue
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
