import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

// Close Icon
function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Gradient Progress Ring Component
function GradientProgressRing({
  progress,
  size = 200,
  strokeWidth = 16,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={tw`items-center justify-center`}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#22c55e" />
            <Stop offset="50%" stopColor="#84cc16" />
            <Stop offset="100%" stopColor="#fbbf24" />
          </LinearGradient>
        </Defs>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={tw`absolute items-center justify-center`}>
        <AppText style={tw`text-5xl font-bold text-neutral-900`}>2/3</AppText>
        <AppText style={tw`text-lg text-neutral-500 mt-1`}>Day 05</AppText>
      </View>
    </View>
  );
}

export default function LessonCompletedScreen() {
  const userName = "Amy";

  const handleClose = () => {
    router.replace("/(tabs)");
  };

  const handleContinue = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Close Button */}
      <View style={tw`px-6 pt-4 flex-row justify-end`}>
        <TouchableOpacity onPress={handleClose}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={tw`flex-1 px-6 items-center justify-center`}>
        {/* Progress Ring */}
        <GradientProgressRing progress={66} size={220} strokeWidth={18} />

        {/* Celebration */}
        <View style={tw`items-center mt-8`}>
          <AppText style={tw`text-4xl mb-2`}>🎉</AppText>
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-3`}>
            Lesson completed
          </AppText>
          <View style={tw`flex-row items-center`}>
            <AppText style={tw`text-base`}>✨</AppText>
            <AppText style={tw`text-base text-neutral-600 ml-2 text-center`}>
              Great job, {userName}! You're making{"\n"}excellent progress. See you tomorrow!
            </AppText>
          </View>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={tw`px-6 pb-4`}>
        <Button onPress={handleContinue}>Alright See Ya!</Button>
      </View>
    </SafeAreaView>
  );
}

