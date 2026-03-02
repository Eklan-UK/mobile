import React from "react";
import { View, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import tw from "@/lib/tw";
import { AppText } from "@/components/ui/AppText";
import Svg, { Path } from "react-native-svg";

interface Props {
  onBookCall: () => void;
}

export function DetailedFeedbackLocked({ onBookCall }: Props) {
  return (
    <View style={tw`bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 mb-4 overflow-hidden relative`}>
      <View style={tw`px-4 pt-3.5 pb-6 opacity-30`}>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={tw`flex-1`}>
            <AppText style={tw`text-base font-bold text-neutral-900 dark:text-white`}>
              Detailed breakdown
            </AppText>
            <AppText style={tw`text-xs text-neutral-500 dark:text-neutral-400 mt-0.5`}>
              Here is a breakdown of your performance
            </AppText>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ transform: [{ rotate: "0deg" }] }}>
            <Path d="M6 9l6 6 6-6" stroke="#737373" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={tw`flex-row flex-wrap gap-2 mt-2 py-4`}>
          <View style={tw`bg-gray-200 dark:bg-neutral-700 rounded-lg w-20 h-6`} />
          <View style={tw`bg-gray-200 dark:bg-neutral-700 rounded-lg w-16 h-6`} />
          <View style={tw`bg-gray-200 dark:bg-neutral-700 rounded-lg w-24 h-6`} />
          <View style={tw`bg-gray-200 dark:bg-neutral-700 rounded-lg w-14 h-6`} />
          <View style={tw`bg-gray-200 dark:bg-neutral-700 rounded-lg w-28 h-6`} />
        </View>
      </View>
      
      <View style={tw`absolute inset-0 bg-white/70 dark:bg-neutral-900/80 items-center justify-center p-5 z-10`}>
          <View style={tw`w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-full items-center justify-center mb-3 mt-4`}>
             <AppText style={tw`text-xl`}>🔒</AppText>
          </View>
          <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white mb-1 text-center`}>
            Detailed feedback is locked
          </AppText>
          <AppText style={tw`text-sm text-neutral-600 dark:text-neutral-300 mb-5 text-center px-2 leading-relaxed`}>
            Unlock detailed insights into your pronunciation including phoneme-level clarity.
          </AppText>
          
          <TouchableOpacity
            style={tw`w-full bg-emerald-600 rounded-full py-3 items-center mb-2`}
            onPress={onBookCall}
            activeOpacity={0.8}
          >
            <AppText style={tw`text-white font-semibold text-sm`}>
              Book My Performance Review
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`w-full border border-neutral-300 dark:border-neutral-700 rounded-full py-3 items-center`}
            onPress={() => router.push("/premium")}
            activeOpacity={0.8}
          >
            <AppText style={tw`text-neutral-700 dark:text-neutral-300 font-semibold text-sm`}>
              Upgrade to Premium
            </AppText>
          </TouchableOpacity>
      </View>
    </View>
  );
}
