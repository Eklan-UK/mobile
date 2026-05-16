import { AppText, BoldText } from "@/components/ui";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PressureTestScreen() {
  const isSubscribed = useIsSubscribed();

  useFocusEffect(
    useCallback(() => {
      if (!isSubscribed) {
        router.replace("/premium");
      }
    }, [isSubscribed])
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <View style={tw`px-5 pt-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mb-6`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-1 items-center justify-center px-8`}>
        <View style={tw`w-16 h-16 rounded-2xl bg-[#2a602c] items-center justify-center mb-5`}>
          <Ionicons name="flash" size={32} color="#FBD100" />
        </View>

        <BoldText style={tw`text-2xl font-bold text-[#101828] dark:text-white text-center mb-3`}>
          Eklan Pressure Test
        </BoldText>

        <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 text-center leading-relaxed mb-8`}>
          Test your response speed in a real-life scenario. Coming soon.
        </AppText>

        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`bg-[#2a602c] rounded-full px-8 py-3`}
          activeOpacity={0.8}
        >
          <BoldText style={tw`text-white text-sm font-semibold`}>Go back</BoldText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
