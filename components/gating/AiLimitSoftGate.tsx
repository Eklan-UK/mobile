import React from "react";
import { View, TouchableOpacity, Modal } from "react-native";
import { router } from "expo-router";
import tw from "@/lib/tw";
import { AppText } from "@/components/ui/AppText";

interface Props {
  visible: boolean;
  onClose: () => void;
  metric?: { label: string; value: string };
}

export function AiLimitSoftGate({ visible, onClose, metric = { label: "Pronunciation clarity", value: "75%" } }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 z-50 bg-black/50 justify-end`}>
        <View style={tw`bg-white dark:bg-neutral-900 rounded-t-3xl px-6 pt-8 pb-10`}>

          {/* Title */}
          <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white mb-3`}>
            Great practice today.
          </AppText>

          {/* Subtitle */}
          <AppText style={tw`text-base text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6`}>
            You've reached today's free speaking limit.{"\n"}
            Your next step is unlocking structured progress.
          </AppText>

          {/* Metric card */}
          <View style={tw`bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-5 py-5 flex-row items-center justify-between mb-8`}>
            <AppText style={tw`text-base font-semibold text-neutral-900 dark:text-white`}>
              {metric.label}
            </AppText>
            <AppText style={tw`text-base font-semibold text-neutral-900 dark:text-white`}>
              {metric.value}
            </AppText>
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={tw`w-full bg-green-700 rounded-full py-4 items-center mb-3`}
            onPress={() => {
              onClose();
              router.push("/book-call");
            }}
            activeOpacity={0.85}
          >
            <AppText style={tw`text-white font-semibold text-base`}>
              Continue My Progress
            </AppText>
          </TouchableOpacity>

          {/* Secondary CTA */}
          <TouchableOpacity
            style={tw`w-full border border-neutral-300 dark:border-neutral-700 rounded-full py-4 items-center`}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-green-700 dark:text-green-500 font-semibold text-base`}>
              Practice Tomorrow
            </AppText>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}