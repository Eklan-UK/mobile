import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useRef } from "react";
import { Image, ScrollView, TouchableOpacity, View, useColorScheme } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ThemeSheet } from "@/components/settings/ThemeSheet";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStore } from "@/store/theme-store";

// Helper hook to get the effective theme (reactive)
function useEffectiveTheme() {
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();
  return theme === "system" ? (systemColorScheme || "light") : theme;
}

// Icons
function BackIcon() {
  const isDark = useEffectiveTheme() === "dark";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={isDark ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  const isDark = useEffectiveTheme() === "dark";
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={isDark ? "#737373" : "#a3a3a3"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Settings Item Component
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
        style={tw`flex-row items-center justify-between py-4`}
      >
        <AppText style={tw`text-base text-neutral-900 dark:text-white`}>{label}</AppText>
        <View style={tw`flex-row items-center gap-2`}>
          {value && <AppText style={tw`text-base text-neutral-500 dark:text-neutral-400`}>{value}</AppText>}
          <ChevronRightIcon />
        </View>
      </TouchableOpacity>
      {showDivider && <View style={tw`h-px bg-neutral-200 dark:bg-neutral-800`} />}
    </>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const themeSheetRef = useRef<BottomSheetModal>(null);
  const { theme } = useThemeStore();
  
  const displayUser = {
    name: user ? `${user.firstName} ${user.lastName}` : "User",
    avatar: user?.avatar || null,
  };

  const handleBack = () => {
    router.back();
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack} style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Settings</AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <TouchableOpacity
          style={tw`flex-row items-center gap-4 py-4`}
          onPress={() => router.push("/edit-profile")}
        >
          <View
            style={tw`w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700`}
          >
            {displayUser.avatar ? (
              <Image source={{ uri: displayUser.avatar }} style={tw`w-full h-full`} />
            ) : (
              <AppText style={tw`text-2xl`}>👩‍🎨</AppText>
            )}
          </View>
          <View style={tw`flex-1`}>
            <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>
              {displayUser.name}
            </AppText>
            <AppText style={tw`text-sm text-primary-500 dark:text-primary-400 mt-0.5`}>Edit profile</AppText>
          </View>
        </TouchableOpacity>

        {/* Preferences Section */}
        <View style={tw`mt-4`}>
          <SettingsItem label="Nationality" value="Korean" onPress={() => router.push("/nationality")} />
          <SettingsItem label="App language" value="English" onPress={() => router.push("/app-language")} />
          <SettingsItem label="Learning goals" value="Speak..." onPress={() => router.push("/learning-goals")} />
          <SettingsItem
            label="Notifications"
            onPress={() => router.push("/notifications-settings")}
          />
          <SettingsItem label="Lesson" onPress={() => router.push("/lesson-settings")} showDivider={false} />
        </View>

        {/* App Settings Section */}
        <View style={tw`mt-6`}>
          <SettingsItem
            label="Theme"
            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
            onPress={() => themeSheetRef.current?.present()}
          />
          <SettingsItem label="Help" onPress={() => router.push("/help")} />
          <SettingsItem
            label="Subscriptions"
            onPress={() => router.push("/premium")}
          />
          <SettingsItem
            label="Privacy policy"
            onPress={() => router.push("/privacy-policy")}
          />
          <SettingsItem
            label="Terms of use"
            onPress={() => router.push("/terms-of-use")}
            showDivider={false}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={tw`py-6`}>
          <AppText style={tw`text-base text-error font-bold`}>Logout</AppText>
        </TouchableOpacity>

        {/* Version */}
        <View style={tw`items-center mt-6 flex-row justify-center gap-2`}>
          <AppText style={tw`text-sm text-neutral-200`}>{"<"}</AppText>
          <AppText style={tw`text-sm text-neutral-400`}>eklan version 1.0</AppText>
          <AppText style={tw`text-sm text-neutral-200`}>{">"}</AppText>
        </View>
      </ScrollView>

      <ThemeSheet ref={themeSheetRef} />
    </SafeAreaView>
  );
}
