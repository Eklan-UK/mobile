import { AppText, BoldText, Button, Input } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// Progress dots component
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2 mb-8`}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={tw`${index < current ? "bg-primary-500 w-6" : index === current ? "bg-primary-500 w-6" : "bg-neutral-200 w-2"} h-2 rounded-full`}
        />
      ))}
    </View>
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

export default function NameScreen() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;

    setLoading(true);
    // TODO: Save name to user profile
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);

    router.push({
      pathname: "/(profile-setup)/role",
      params: { name: name.trim() },
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <View style={tw`flex-1 px-6 pt-8`}>
          {/* Progress: step 1 of 6 in post-auth onboarding */}
          <ProgressDots current={0} total={6} />

          {/* Title */}
          <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
            Confirm your name
          </BoldText>
          <AppText style={tw`text-base text-neutral-500 mb-6`}>
            What should we call you?
          </AppText>

          {/* Name Input */}
          <Input
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            icon={<UserIcon />}
          />

          {/* Spacer */}
          <View style={tw`flex-1`} />

          {/* Continue Button */}
          <View style={tw`pb-4`}>
            <Button
              onPress={handleContinue}
              loading={loading}
              disabled={!name.trim()}
            >
              Continue
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
