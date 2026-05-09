import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View, useColorScheme } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ThemeSheet } from "@/components/settings/ThemeSheet";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStore } from "@/store/theme-store";
import { useUserCurrent, useResendVerification } from "@/hooks/useSettings";
import type { UserProfile } from "@/types/settings";
import { LEARNING_GOAL_ITEMS } from "@/constants/settings-options";

// ─── Helper hook ───────────────────────────────────────────────────────────────

function useEffectiveTheme() {
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();
  return theme === "system" ? (systemColorScheme || "light") : theme;
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

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

function VerifiedIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#22c55e" />
      <Path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UnverifiedIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#f59e0b" />
      <Path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <AppText style={tw`text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1 mt-6`}>
      {title}
    </AppText>
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
        style={tw`flex-row items-center justify-between py-4`}
      >
        <AppText style={tw`text-base text-neutral-900 dark:text-white`}>{label}</AppText>
        <View style={tw`flex-row items-center gap-2`}>
          {value ? (
            <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400`}>{value}</AppText>
          ) : null}
          <ChevronRightIcon />
        </View>
      </TouchableOpacity>
      {showDivider && <View style={tw`h-px bg-neutral-200 dark:bg-neutral-800`} />}
    </>
  );
}

// ─── Derived label helpers ─────────────────────────────────────────────────────

function goalLabel(profile?: UserProfile): string | undefined {
  if (!profile?.learningGoal && (!profile?.learningGoals || profile.learningGoals.length === 0)) {
    return undefined;
  }
  const id = profile?.learningGoal ?? profile?.learningGoals?.[0];
  const item = LEARNING_GOAL_ITEMS.find((g) => g.id === id);
  if (!item) return undefined;
  // Truncate for hub label
  return item.text.length > 18 ? item.text.slice(0, 18) + '…' : item.text;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { user: authUser, logout } = useAuth();
  const themeSheetRef = useRef<BottomSheetModal>(null);
  const { theme } = useThemeStore();

  const { data: me, isLoading: loadingUser } = useUserCurrent();
  const resendMutation = useResendVerification();

  const user = me?.user ?? authUser;
  const profile = me?.profile;

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "83f2a9" },
      body: JSON.stringify({
        sessionId: "83f2a9",
        location: "settings.tsx:profile.language",
        message: "Settings hub profile.language",
        data: { profileLanguage: profile?.language ?? null },
        timestamp: Date.now(),
        hypothesisId: "H3_H4",
      }),
    }).catch(() => {});
  }, [profile?.language]);
  // #endregion

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User'
    : 'User';
  const avatar = user?.avatar ?? null;
  const email = user?.email ?? '';
  const isEmailVerified = user?.emailVerified || (user as any)?.isEmailVerified || false;

  const handleBack = () => router.back();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
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

  const handleResendVerification = async () => {
    try {
      const result = await resendMutation.mutateAsync();
      if (result.code === 'AlreadyVerified') {
        Alert.alert("Already Verified", "Your email is already verified.");
      } else {
        Alert.alert("Email Sent", "A verification email has been sent to your inbox.");
      }
    } catch {
      Alert.alert("Error", "Could not send verification email. Please try again.");
    }
  };

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
        <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Settings</AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <TouchableOpacity
          style={tw`flex-row items-center gap-4 py-4`}
          onPress={() => router.push("/edit-profile")}
        >
          <View style={tw`w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700`}>
            {loadingUser ? (
              <ActivityIndicator size="small" />
            ) : avatar ? (
              <Image source={{ uri: avatar }} style={tw`w-full h-full`} />
            ) : (
              <AppText style={tw`text-2xl`}>👩‍🎨</AppText>
            )}
          </View>
          <View style={tw`flex-1`}>
            <BoldText style={tw`text-lg text-neutral-900 dark:text-white`}>{displayName}</BoldText>
            <AppText style={tw`text-sm text-primary-500 dark:text-primary-400 mt-0.5`}>Edit profile</AppText>
          </View>
        </TouchableOpacity>

        {/* ── Account section ──────────────────────────────────────────── */}
        <SectionHeader title="Account" />
        <View style={tw`bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl px-4`}>
          {/* Email with verification status */}
          <View style={tw`flex-row items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800`}>
            <AppText style={tw`text-base text-neutral-900 dark:text-white`}>Email</AppText>
            <View style={tw`flex-row items-center gap-2 flex-shrink`}>
              <AppText
                numberOfLines={1}
                style={tw`text-sm text-neutral-500 dark:text-neutral-400 max-w-[180px]`}
              >
                {email}
              </AppText>
              {isEmailVerified ? <VerifiedIcon /> : <UnverifiedIcon />}
            </View>
          </View>

          {/* Resend verification (only when not verified) */}
          {!isEmailVerified && (
            <TouchableOpacity
              onPress={handleResendVerification}
              disabled={resendMutation.isPending}
              style={tw`py-4 border-b border-neutral-200 dark:border-neutral-800`}
            >
              <AppText style={tw`text-base text-amber-600 dark:text-amber-400`}>
                {resendMutation.isPending ? "Sending…" : "Resend verification email"}
              </AppText>
            </TouchableOpacity>
          )}

          {/* Change password */}
          <TouchableOpacity
            onPress={() => router.push("/change-password")}
            style={tw`flex-row items-center justify-between py-4`}
          >
            <AppText style={tw`text-base text-neutral-900 dark:text-white`}>Change Password</AppText>
            <ChevronRightIcon />
          </TouchableOpacity>
        </View>

        {/* ── Preferences section ──────────────────────────────────────── */}
        <SectionHeader title="Preferences" />
        <View style={tw`bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl px-4`}>
          <SettingsItem
            label="Nationality"
            value={profile?.nationality ?? undefined}
            onPress={() => router.push("/nationality")}
          />
          <SettingsItem
            label="App language"
            value={profile?.language ?? undefined}
            onPress={() => router.push("/app-language")}
          />
          <SettingsItem
            label="Learning goals"
            value={goalLabel(profile)}
            onPress={() => router.push("/learning-goals")}
          />
          <SettingsItem
            label="Notifications"
            onPress={() => router.push("/notifications-settings")}
          />
          <SettingsItem
            label="Lesson"
            onPress={() => router.push("/lesson-settings")}
          />
          <SettingsItem
            label="Theme"
            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
            onPress={() => themeSheetRef.current?.present()}
            showDivider={false}
          />
        </View>

        {/* ── Support section ──────────────────────────────────────────── */}
        <SectionHeader title="Support" />
        <View style={tw`bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl px-4`}>
          <SettingsItem label="Help" onPress={() => router.push("/help")} />
          <SettingsItem label="FAQ" onPress={() => router.push("/faq")} />
          <SettingsItem label="Contact Us" onPress={() => router.push("/contact")} showDivider={false} />
        </View>

        {/* ── Legal section ─────────────────────────────────────────────── */}
        <SectionHeader title="Legal" />
        <View style={tw`bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl px-4`}>
          <SettingsItem
            label="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
          />
          <SettingsItem
            label="Terms of Service"
            onPress={() => router.push("/terms-of-use")}
            showDivider={false}
          />
        </View>

        {/* ── Subscription ──────────────────────────────────────────────── */}
        <SectionHeader title="Subscription" />
        <View style={tw`bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl px-4`}>
          <SettingsItem
            label="Subscriptions"
            value={user?.subscriptionPlan === 'premium' ? 'Pro' : 'Free'}
            onPress={() => router.push("/premium")}
            showDivider={false}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={tw`py-6`}>
          <AppText style={tw`text-base text-red-500 font-bold`}>Logout</AppText>
        </TouchableOpacity>

        {/* Version */}
        <View style={tw`items-center flex-row justify-center gap-2`}>
          <AppText style={tw`text-sm text-neutral-200`}>{"<"}</AppText>
          <AppText style={tw`text-sm text-neutral-400`}>eklan version 1.0</AppText>
          <AppText style={tw`text-sm text-neutral-200`}>{">"}</AppText>
        </View>
      </ScrollView>

      <ThemeSheet ref={themeSheetRef} />
    </SafeAreaView>
  );
}
