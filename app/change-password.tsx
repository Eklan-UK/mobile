import { AppText, Button, Input } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Alert } from "@/utils/alert";
import { useChangePassword } from "@/hooks/useSettings";
import type { SettingsApiError } from "@/types/settings";

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

/** Client-side validation — returns an error string or null if valid. */
function validate(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): string | null {
  if (!currentPassword.trim()) return 'Current password is required.';
  if (newPassword.length < 8) return 'New password must be at least 8 characters.';
  if (newPassword !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);

  const mutation = useChangePassword();

  const handleSubmit = async () => {
    setCurrentPasswordError(null);

    const clientError = validate(currentPassword, newPassword, confirmPassword);
    if (clientError) {
      Alert.alert("Validation Error", clientError);
      return;
    }

    try {
      await mutation.mutateAsync({ currentPassword, newPassword });
      Alert.alert("Password Changed", "Your password has been updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      const apiErr = err as SettingsApiError;

      if (apiErr.code === 'NoPasswordError') {
        Alert.alert(
          "Social Login Account",
          "Your account uses social login — password cannot be changed."
        );
        return;
      }

      if (apiErr.code === 'InvalidPasswordError') {
        setCurrentPasswordError('Incorrect current password.');
        return;
      }

      Alert.alert("Error", apiErr.message || "Could not change password. Please try again.");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
          >
            <BackIcon />
          </TouchableOpacity>
          <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>
            Change Password
          </AppText>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pt-2 pb-6 gap-5`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400`}>
            Choose a new password with at least 8 characters.
          </AppText>

          <View>
            <Input
              label="Current password"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                if (currentPasswordError) setCurrentPasswordError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            {currentPasswordError ? (
              <AppText style={tw`text-sm text-red-500 mt-1`}>{currentPasswordError}</AppText>
            ) : null}
          </View>

          <Input
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Input
            label="Confirm new password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            tw`px-6 pt-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800`,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Button
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            Save Password
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
