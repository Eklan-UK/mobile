import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PracticeModeComingSoonScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/practice");
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={tw`px-5 pt-4`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mb-6`}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-1 items-center justify-center px-8`}>
        <BoldText style={tw`text-2xl font-bold text-[#101828] dark:text-white text-center mb-3`}>
          Coming soon
        </BoldText>

        <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 text-center leading-relaxed`}>
          This practice mode is not available yet. Check back later.
        </AppText>
      </View>
    </SafeAreaView>
  );
}
