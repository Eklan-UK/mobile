import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

function SettingsItem({
  label,
  value,
  onPress,
  showDivider = true,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={tw`flex-row items-center justify-between py-5`}
      >
        <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-300`}>{label}</AppText>
        <View style={tw`flex-row items-center gap-2`}>
          {value && <AppText style={tw`text-[15px] text-neutral-400 dark:text-neutral-500`}>{value}</AppText>}
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18l6-6-6-6"
              stroke={tw.prefixMatch('dark') ? "#525252" : "#a3a3a3"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </TouchableOpacity>
      {showDivider && <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800`} />}
    </>
  );
}

function SettingsToggle({
  label,
  value,
  onValueChange,
  showDivider = true,
}: {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <View style={tw`flex-row items-center justify-between py-4`}>
        <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-300`}>{label}</AppText>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: tw.prefixMatch('dark') ? "#404040" : "#e5e5e5", true: "#4ade80" }} // green-400
          thumbColor="#ffffff"
          ios_backgroundColor={tw.prefixMatch('dark') ? "#404040" : "#e5e5e5"}
        />
      </View>
      {showDivider && <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800`} />}
    </>
  );
}

export default function LessonSettingsScreen() {
  const [eklanTalks, setEklanTalks] = useState(true);
  const [chatTranslation, setChatTranslation] = useState(false);

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
        >
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Lesson</AppText>
      </View>

      <ScrollView contentContainerStyle={tw`px-6 pt-4`}>
        <SettingsToggle
          label="eklan talks"
          value={eklanTalks}
          onValueChange={setEklanTalks}
        />
        <SettingsToggle
          label="Chat translation"
          value={chatTranslation}
          onValueChange={setChatTranslation}
        />
        <SettingsItem
          label="English type / accent"
          value="British"
        />
        <SettingsItem
          label="eklan's voice"
          value="Warm"
        />
        <SettingsItem
          label="Speaking speed"
          value="Normal"
          showDivider={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
