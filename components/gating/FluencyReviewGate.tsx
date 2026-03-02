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
  <View style={tw`flex-row items-start py-3 gap-3`}>
    <TargetIcon />
    <AppText style={tw`flex-1 text-base text-neutral-800 dark:text-neutral-200 leading-snug`}>
      {text}
    </AppText>
  </View>
);

export function FluencyReviewGate({ visible, onClose }: Props) {
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
            <AppText style={tw`text-neutral-600 dark:text-neutral-400 text-base`}>←</AppText>
          </TouchableOpacity>

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
        <AppText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight`}>
          Stop Translating. Start Speaking.
        </AppText>

        {/* Subtitle */}
        <AppText style={tw`text-base text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6`}>
          Before your words come out, your brain often first switches to Korean.{"\n"}
          That translation habit creates hesitation.
        </AppText>

        {/* Benefits card */}
        <View style={tw`border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 mb-6`}>
          <View style={tw`pt-4 pb-2`}>
            <AppText style={tw`text-green-700 dark:text-green-500 font-bold text-base`}>
              During your 1:1 Performance Review, we will:
            </AppText>
          </View>

          <View style={tw`border-b border-neutral-100 dark:border-neutral-800`} />

          <BenefitItem text="Identify where translation happens" />
          <View style={tw`border-t border-neutral-100 dark:border-neutral-800`} />
          <BenefitItem text="Measure how long you hesitate before speaking" />
          <View style={tw`border-t border-neutral-100 dark:border-neutral-800`} />
          <BenefitItem text="Test your response under pressure" />
          <View style={tw`border-t border-neutral-100 dark:border-neutral-800`} />
          <BenefitItem text="Define a 30-day plan to eliminate the habit so you can start thinking and speaking in English instantly" />

          {/* Footer note */}
          <View style={tw`pt-2 pb-4`}>
            <AppText style={tw`text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed`}>
              20–30 minute guided session focused on performance — not fluency.
            </AppText>
          </View>
        </View>

        <View style={tw`flex-1`} />
      </ScrollView>

      {/* Bottom buttons */}
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
            Book My Fluency Review
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`w-full items-center py-2`}
          activeOpacity={0.7}
          onPress={onClose}
        >
          <AppText style={tw`text-green-700 dark:text-green-500 font-medium text-base`}>
            Maybe Later
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}