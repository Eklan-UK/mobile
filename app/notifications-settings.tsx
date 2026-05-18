import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useUserCurrent, useUpdatePreferences } from "@/hooks/useSettings";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/settings";
import type { NotificationPreferences } from "@/types/settings";

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
  description,
  value,
  onValueChange,
  showDivider = true,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <View style={tw`flex-row items-center justify-between py-4.5`}>
        <View style={tw`flex-1 mr-4`}>
          <AppText style={tw`text-[15px] text-neutral-900 dark:text-white`}>{label}</AppText>
          {description ? (
            <AppText style={tw`text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5`}>
              {description}
            </AppText>
          ) : null}
        </View>
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
  const { data: me } = useUserCurrent();
  const mutation = useUpdatePreferences();

  const serverPrefs: NotificationPreferences =
    me?.profile?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const [local, setLocal] = useState<NotificationPreferences>(serverPrefs);

  // Sync local state when server data loads for the first time
  useEffect(() => {
    if (me?.profile?.notificationPreferences) {
      setLocal(me.profile.notificationPreferences);
    }
  }, [me?.profile?.notificationPreferences]);

  const toggle = (key: keyof NotificationPreferences) => {
    const updated: NotificationPreferences = { ...local, [key]: !local[key] };
    setLocal(updated);
    // Fire-and-forget: optimistic update is handled in the hook
    mutation.mutate({ notificationPreferences: updated });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
        >
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>Notifications</AppText>
      </View>

      <AppText style={tw`px-6 text-sm text-neutral-500 dark:text-neutral-400 mb-4`}>
        Control which email notifications you receive from eklan.
      </AppText>

      {/* Settings list */}
      <View style={tw`px-6`}>
        <NotificationItem
          label="Learning Reminders"
          description="Daily nudges to keep your streak going"
          value={local.learningReminders}
          onValueChange={() => toggle('learningReminders')}
        />
        <NotificationItem
          label="Special Offers"
          description="Promotions and discounts on premium plans"
          value={local.specialOffers}
          onValueChange={() => toggle('specialOffers')}
        />
        <NotificationItem
          label="Subscription Expiry"
          description="Get notified before your plan expires"
          value={local.subscriptionExpires}
          onValueChange={() => toggle('subscriptionExpires')}
          showDivider={false}
        />
      </View>
    </SafeAreaView>
  );
}
