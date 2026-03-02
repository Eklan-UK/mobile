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

const LANGUAGES = [
  { id: "ko", name: "Korean", native: "한국어" },
  { id: "es", name: "Spanish", native: "Español" },
  { id: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { id: "pt", name: "Portuguese", native: "Português" },
  { id: "ar", name: "Arabic", native: "عربي" },
  { id: "fr", name: "French", native: "Français" },
  { id: "en", name: "English", native: "" },
  { id: "ja", name: "Japanese", native: "日本語" },
  { id: "pl", name: "Polish", native: "Polski" },
];

export default function AppLanguageScreen() {
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
          What language should the app use?
        </AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.id;
          return (
            <TouchableOpacity
              key={lang.id}
              onPress={() => setSelected(lang.id)}
              style={tw`flex-row items-center justify-between p-5 mb-3 rounded-[24px] border ${
                isSelected ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30" : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <AppText style={tw`text-base text-neutral-900 dark:text-white font-medium`}>
                {lang.name}
              </AppText>
              
              {lang.native ? (
                <AppText style={tw`text-base text-neutral-600 dark:text-neutral-400 font-medium`}>
                  {lang.native}
                </AppText>
              ) : null}
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
