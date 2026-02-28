import { AppText, BoldText, Button, Input } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// Icons
function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#171717"
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
      <Circle cx={12} cy={8} r={4} stroke="#737373" strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke="#737373"
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
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ContactScreen() {
  const [name, setName] = useState("Amy kosuleim");
  const [email, setEmail] = useState("Amyko@gmail.com");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    // TODO: Implement contact form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);

    Alert.alert(
      "Message Sent",
      "Thank you for reaching out! We'll get back to you within 24 hours.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
          <TouchableOpacity onPress={handleBack}>
            <BackIcon />
          </TouchableOpacity>
          <AppText style={tw`text-xl font-bold text-neutral-900`}>Contact Us</AppText>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pb-6`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        {/* Form */}
        <View style={tw`gap-5`}>
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
            <AppText style={tw`text-sm font-medium text-neutral-700 mb-2`}>Subject</AppText>
            <View style={tw`bg-white border border-neutral-200 rounded-xl px-4 py-3`}>
              <TextInput
                placeholder="What's this about?"
                value={subject}
                onChangeText={setSubject}
                style={tw`text-base text-neutral-900`}
                placeholderTextColor="#a3a3a3"
              />
            </View>
          </View>

          <View>
            <AppText style={tw`text-sm font-medium text-neutral-700 mb-2`}>Your message</AppText>
            <View style={tw`bg-white border border-neutral-200 rounded-xl px-4 py-3`}>
              <TextInput
                placeholder="Tell us how we can help..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={tw`text-base text-neutral-900 min-h-[150px]`}
                placeholderTextColor="#a3a3a3"
              />
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={tw`bg-blue-50 rounded-xl p-4 mt-6 border border-blue-200`}>
          <View style={tw`flex-row items-start gap-3`}>
            <AppText style={tw`text-xl`}>📧</AppText>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-sm text-blue-800`}>
                You can also reach us directly at{" "}
                <AppText style={tw`font-bold`}>hello@eklan.aiAI.com</AppText>
              </AppText>
            </View>
          </View>
        </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[tw`px-6 pb-4 bg-cream-100`, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button onPress={handleSubmit} loading={loading}>
            Submit
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

