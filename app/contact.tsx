import { AppText, Button, Input } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Alert } from "@/utils/alert";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitContact } from "@/hooks/useSettings";
import type { SettingsApiError } from "@/types/settings";

const MAX_MESSAGE_LENGTH = 500;

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

function UserIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"} strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EmailIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [name, setName] = useState(
    user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : ''
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const mutation = useSubmitContact();

  const isFormValid =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    message.length <= MAX_MESSAGE_LENGTH;

  const handleSubmit = async () => {
    if (!isFormValid) {
      if (!isValidEmail(email)) {
        Alert.alert("Invalid email", "Please enter a valid email address.");
        return;
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        Alert.alert("Message too long", `Your message must be at most ${MAX_MESSAGE_LENGTH} characters.`);
        return;
      }
      Alert.alert("Incomplete form", "Please fill in all fields.");
      return;
    }

    try {
      await mutation.mutateAsync({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      Alert.alert(
        "Message Sent",
        "Thank you for reaching out! We'll get back to you within 24 hours.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      const apiErr = err as SettingsApiError;
      Alert.alert("Error", apiErr.message || "Failed to send message. Please try again.");
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
          <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Contact Us</AppText>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pb-6 pt-2 gap-5`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Input
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            icon={<UserIcon />}
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<EmailIcon />}
          />

          <View>
            <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-400 mb-2`}>Subject</AppText>
            <View style={tw`bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl px-4 py-3.5`}>
              <TextInput
                placeholder="What is this about?"
                value={subject}
                onChangeText={setSubject}
                style={tw`text-[15px] text-neutral-900 dark:text-white`}
                placeholderTextColor="#a3a3a3"
              />
            </View>
          </View>

          <View>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-400`}>Your message</AppText>
              <AppText
                style={tw`text-[13px] ${
                  message.length > MAX_MESSAGE_LENGTH
                    ? "text-red-500"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {message.length}/{MAX_MESSAGE_LENGTH}
              </AppText>
            </View>
            <View style={tw`bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-3xl px-4 py-4`}>
              <TextInput
                placeholder="Tell us how we can help you…"
                value={message}
                onChangeText={(v) => {
                  if (v.length <= MAX_MESSAGE_LENGTH) setMessage(v);
                }}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                style={tw`text-[15px] text-neutral-900 dark:text-white min-h-[180px]`}
                placeholderTextColor="#a3a3a3"
                maxLength={MAX_MESSAGE_LENGTH}
              />
            </View>
          </View>
        </ScrollView>

        {/* Submit */}
        <View
          style={[
            tw`px-6 pb-4 bg-white dark:bg-neutral-900`,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Button
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={!isFormValid}
          >
            Submit
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
