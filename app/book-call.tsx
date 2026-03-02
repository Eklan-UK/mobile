import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import tw from "@/lib/tw";
import { AppText, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/api";
import { Alert } from "@/utils/alert";
import { router } from "expo-router";

export default function BookCallScreen() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const name =
    (user?.firstName || user?.lastName
      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
      : user?.email) || "Eklan learner";

  const email = user?.email || "";

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("Required", "Please tell us a bit about what you need help with.");
      return;
    }
    if (!email) {
      Alert.alert("Missing email", "We couldn't find your email. Please update your profile first.");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/api/v1/contact/book-call", {
        name,
        email,
        message: message.trim(),
      });
      Alert.alert(
        "Sent",
        "Your message has been sent. We'll contact you by email to schedule your call."
      );
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={tw`px-5 pt-4 pb-3 flex-row items-center justify-between`}>
          <AppText style={tw`text-xl font-bold text-neutral-900`}>Book a call</AppText>
          <TouchableOpacity onPress={() => router.back()}>
            <AppText style={tw`text-base text-neutral-500`}>Close</AppText>
          </TouchableOpacity>
        </View>

        <View style={tw`px-5 mt-2`}>
          <AppText style={tw`text-sm text-neutral-600 mb-4`}>
            Tell us a bit about your goals so we can tailor your English coaching and subscription
            to you.
          </AppText>

          <View style={tw`mb-4`}>
            <AppText style={tw`text-xs font-semibold text-neutral-500 mb-1`}>Name</AppText>
            <View
              style={tw`border border-neutral-200 rounded-xl px-3 py-2 bg-neutral-50`}
            >
              <AppText style={tw`text-sm text-neutral-900`}>{name}</AppText>
            </View>
          </View>

          <View style={tw`mb-4`}>
            <AppText style={tw`text-xs font-semibold text-neutral-500 mb-1`}>Email</AppText>
            <View
              style={tw`border border-neutral-200 rounded-xl px-3 py-2 bg-neutral-50`}
            >
              <AppText style={tw`text-sm text-neutral-900`}>{email}</AppText>
            </View>
          </View>

          <View style={tw`mb-4`}>
            <AppText style={tw`text-xs font-semibold text-neutral-500 mb-1`}>
              What would you like help with?
            </AppText>
            <View
              style={tw`border border-neutral-200 rounded-2xl px-3 py-2 min-h-[140px]`}
            >
              <TextInput
                value={message}
                onChangeText={setMessage}
                style={tw`text-sm text-neutral-900 flex-1`}
                placeholder="Example: I want to prepare for job interviews, improve pronunciation, and stay accountable."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={tw`px-5 pb-6 mt-auto`}>
          <Button onPress={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send message"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}




