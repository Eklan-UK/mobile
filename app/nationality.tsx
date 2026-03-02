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

const NATIONS = [
  { id: "ko", name: "Korean", native: "한국인", flag: "🇰🇷" },
  { id: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { id: "zh", name: "Chinese", native: "中国人", flag: "🇨🇳" },
  { id: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { id: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { id: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { id: "en", name: "English", native: "English", flag: "🇺🇸" },
  { id: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { id: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
];

export default function NationalityScreen() {
  const [selected, setSelected] = useState("ko");
  const insets = useSafeAreaInsets();

  const handleBack = () => router.back();
  const handleDone = () => router.back(); // Normally saves to state

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
          What's your nationality?
        </AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {NATIONS.map((nation) => {
          const isSelected = selected === nation.id;
          return (
            <TouchableOpacity
              key={nation.id}
              onPress={() => setSelected(nation.id)}
              style={tw`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${
                isSelected ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30" : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <AppText style={tw`text-xl`}>{nation.flag}</AppText>
                <AppText style={tw`text-base text-neutral-900 dark:text-white font-medium`}>
                  {nation.name}
                </AppText>
              </View>
              <AppText style={tw`text-base text-neutral-600 dark:text-neutral-400`}>
                {nation.native}
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
