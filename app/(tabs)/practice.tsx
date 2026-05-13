import LogoWhite from "@/assets/icons/logo-white.svg";
import LogoYellow from "@/assets/icons/logo-yellow.svg";
import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PracticeScreen() {
  const handleOpenAiFreeTalk = () => {
    router.push("/practice/free-talk");
  };

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw`px-5 pt-4 pb-3`}>
          <AppText style={tw`text-2xl font-bold text-gray-900 dark:text-white`}>Practice</AppText>
        </View>

        {/* Choose your mode of practice */}
        <View style={tw`px-5 mb-6`}>
          <AppText style={tw`text-base font-bold text-[#101828] dark:text-white mb-3`}>
            Choose your mode of practice
          </AppText>

          <View style={tw`gap-3`}>
            {/* Eklan Free Talk */}
            <TouchableOpacity
              style={tw`bg-white dark:bg-neutral-800 border border-[rgba(231,234,237,0.5)] dark:border-neutral-700 rounded-2xl p-3 flex-row items-center gap-3`}
              activeOpacity={0.7}
              onPress={handleOpenAiFreeTalk}
            >
              <View
                style={tw`h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4CAF50]`}
              >
                <LogoWhite width={22} height={22} />
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-sm font-bold text-[#171717] dark:text-white mb-0.5`}>
                  Eklan Free Talk
                </AppText>
                <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
                  Speak about anything
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Eklan Pressure Test */}
            <TouchableOpacity
              style={tw`bg-white dark:bg-neutral-800 border border-[rgba(231,234,237,0.5)] dark:border-neutral-700 rounded-2xl p-3 flex-row items-center gap-3`}
              activeOpacity={0.7}
              onPress={() => router.push("/practice/pressure-test")}
            >
              <View
                style={tw`h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2A602C]`}
              >
                <LogoYellow width={24} height={24} />
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-sm font-bold text-[#171717] dark:text-white mb-0.5`}>
                  Eklan Pressure Test
                </AppText>
                <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
                  Test your response speed in a real-life scenario.
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

       
      </ScrollView>

    </SafeAreaView>
  );
}