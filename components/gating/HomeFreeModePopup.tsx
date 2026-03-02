import React from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import tw from "@/lib/tw";
import { AppText } from "@/components/ui/AppText";
import TargetIcon from "@/assets/icons/target-arrow-green.svg"

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BenefitItem = ({ text }: { text: string }) => (
  <View style={tw`flex-row items-start py-4 gap-3`}>
    {/* Target icon with checkmark */}
    <View style={tw`w-7 h-7 items-center justify-center mt-0.5`}>
      <TargetIcon />
    </View>
    <AppText style={tw`flex-1 text-base text-neutral-800 dark:text-neutral-200 leading-snug`}>
      {text}
    </AppText>
  </View>
);

export function HomeFreeModePopup({ visible, onClose }: Props) {
  if (!visible) return null;

  return (
    <View style={tw`absolute inset-0 z-50 bg-white dark:bg-neutral-900`}>
      <ScrollView
        contentContainerStyle={tw`flex-grow px-6 pt-16 pb-10`}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={tw`flex-row items-center justify-between mb-8`}>
          <TouchableOpacity
            onPress={onClose}
            style={tw`w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-lg leading-none`}>✕</AppText>
          </TouchableOpacity>

          {/* Language selector */}
          <TouchableOpacity
            style={tw`flex-row items-center gap-1 border border-green-700 rounded-full px-3 py-1.5`}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-green-700 text-sm`}>🌐</AppText>
            <AppText style={tw`text-green-700 text-sm font-medium`}>Eng</AppText>
            <AppText style={tw`text-green-700 text-sm`}>▾</AppText>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <AppText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-3`}>
          You're Practicing in Free Mode
        </AppText>

        {/* Subtitle */}
        <AppText style={tw`text-base text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6`}>
          Free mode helps you practice.{"\n"}
          But it doesn't show you why your English still doesn't come out instantly in important moments.
        </AppText>

        {/* Benefits card */}
        <View style={tw`border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 mb-6`}>
          {/* Card header */}
          <View style={tw`pt-4 pb-2`}>
            <AppText style={tw`text-green-700 dark:text-green-500 font-bold text-base`}>
              Book a Performance Review to:
            </AppText>
          </View>

          <View style={tw`border-b border-neutral-100 dark:border-neutral-800`} />

          <BenefitItem text="Identify where you pause because you translate in your head" />
          <View style={tw`border-t border-neutral-100 dark:border-neutral-800`} />
          <BenefitItem text="See how you respond during live Q&A after your presentations" />
          <View style={tw`border-t border-neutral-100 dark:border-neutral-800`} />
          <BenefitItem text="Get a structured plan to help you think and speak in English at the same time." />

          {/* Footer note */}
          <View style={tw`pt-2 pb-4`}>
            <AppText style={tw`text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed`}>
              Free practice builds repetition.{"\n"}
              Performance Review removes the pause.
            </AppText>
          </View>
        </View>

        {/* Spacer to push buttons down */}
        <View style={tw`flex-1`} />
      </ScrollView>

      {/* Bottom buttons — fixed at bottom */}
      <View style={tw`px-6 pb-8 pt-4 bg-white dark:bg-neutral-900`}>
        <TouchableOpacity
          style={tw`w-full bg-green-700 rounded-full py-4 items-center mb-4`}
          activeOpacity={0.85}
          onPress={() => {
            onClose();
            router.push("/book-call");
          }}
        >
          <AppText style={tw`text-white font-semibold text-base`}>
            Book My Performance Review
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`w-full items-center py-2`}
          activeOpacity={0.7}
          onPress={onClose}
        >
          <AppText style={tw`text-green-700 font-medium text-base`}>
            Continue Free Practice
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}