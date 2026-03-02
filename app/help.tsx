import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { FeedbackSheet } from "@/components/settings/FeedbackSheet";

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

function ChevronRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={tw.prefixMatch('dark') ? "#737373" : "#a3a3a3"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuItem({
  label,
  onPress,
  showDivider = true,
}: {
  label: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={tw`flex-row items-center justify-between py-4.5`}
      >
        <AppText style={tw`text-[15px] text-neutral-900 dark:text-white`}>{label}</AppText>
        <ChevronRightIcon />
      </TouchableOpacity>
      {showDivider && <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800`} />}
    </>
  );
}

export default function HelpScreen() {
  const feedbackSheetRef = useRef<BottomSheetModal>(null);

  const handleBack = () => router.back();
  const handleFAQ = () => router.push("/faq");
  const handleContactUs = () => router.push("/contact");
  const handleFeedback = () => feedbackSheetRef.current?.present();

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack} style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>Help & feedback</AppText>
      </View>

      {/* Menu Items */}
      <View style={tw`px-6 pt-2`}>
        <MenuItem label="Frequently Asked Questions" onPress={handleFAQ} />
        <MenuItem label="Contact Us" onPress={handleContactUs} />
        <MenuItem label="Feedback" onPress={handleFeedback} showDivider={false} />
      </View>

      <FeedbackSheet ref={feedbackSheetRef} />
    </SafeAreaView>
  );
}

