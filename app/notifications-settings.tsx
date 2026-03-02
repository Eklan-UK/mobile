import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { Switch, TouchableOpacity, View } from "react-native";
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

function NotificationItem({
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
      <View style={tw`flex-row items-center justify-between py-4.5`}>
        <AppText style={tw`text-[15px] text-neutral-900 dark:text-white`}>{label}</AppText>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: tw.prefixMatch('dark') ? "#404040" : "#e5e5e5", true: "#22c55e" }}
          thumbColor="#ffffff"
          ios_backgroundColor={tw.prefixMatch('dark') ? "#404040" : "#e5e5e5"}
        />
      </View>
      {showDivider && <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800`} />}
    </>
  );
}

export default function NotificationsSettingsScreen() {
  const [learningReminders, setLearningReminders] = useState(true);
  const [specialOffers, setSpecialOffers] = useState(true);
  const [subscriptionUpdates, setSubscriptionUpdates] = useState(true);

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack} style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>Notifications</AppText>
      </View>

      {/* Settings List */}
      <View style={tw`px-6 pt-2`}>
        <NotificationItem
          label="Learning reminders"
          value={learningReminders}
          onValueChange={setLearningReminders}
        />
        <NotificationItem
          label="Special offers"
          value={specialOffers}
          onValueChange={setSpecialOffers}
        />
        <NotificationItem
          label="Subscription expires update"
          value={subscriptionUpdates}
          onValueChange={setSubscriptionUpdates}
          showDivider={false}
        />
      </View>
    </SafeAreaView>
  );
}
