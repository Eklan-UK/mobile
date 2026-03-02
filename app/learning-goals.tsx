import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const GOALS = [
  { id: "conversations", text: "Speak naturally in conversations", icon: "🗣️" },
  { id: "work", text: "Sound professional at work", icon: "💼" },
  { id: "travel", text: "Travel confidently", icon: "🛫" },
  { id: "interviews", text: "Prepare for Interviews", icon: "📖" },
];

export default function LearningGoalsScreen() {
  const [selected, setSelected] = useState("conversations");
  const insets = useSafeAreaInsets();

  const handleBack = () => router.back();
  const handleDone = () => router.back();

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
        >
          <BackIcon />
        </TouchableOpacity>
      </View>

      <View style={tw`px-6 pt-2 pb-6`}>
        <AppText style={tw`text-2xl font-bold text-neutral-900 dark:text-white`}>
          Why are you learning English?
        </AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {GOALS.map((goal) => {
          const isSelected = selected === goal.id;
          return (
            <TouchableOpacity
              key={goal.id}
              onPress={() => setSelected(goal.id)}
              style={tw`flex-row items-center p-5 mb-4 rounded-[24px] border ${
                isSelected ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30" : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <AppText style={tw`text-2xl mr-4`}>{goal.icon}</AppText>
              <AppText style={tw`text-base text-neutral-900 dark:text-white font-medium`}>
                {goal.text}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[tw`px-6 pt-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800`, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button onPress={handleDone}>Done</Button>
      </View>
    </SafeAreaView>
  );
}
