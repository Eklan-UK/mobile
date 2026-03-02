import React from "react";
import { View, TouchableOpacity, Modal } from "react-native";
import { router } from "expo-router";
import tw from "@/lib/tw";
import { AppText } from "@/components/ui/AppText";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PlanCompletedGate({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 z-50 bg-black/40 items-center justify-center px-6`}>
        <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm items-center`}>
          <View style={tw`w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4`}>
            <AppText style={tw`text-2xl`}>🔒</AppText>
          </View>

          <AppText style={tw`text-xl font-bold text-neutral-900 mb-3 text-center`}>
            Still Translating In Your Head Before You  Speak?
          </AppText>
          <AppText style={tw`text-sm text-neutral-600 mb-6 text-center leading-relaxed flex-wrap`}>
            You've finished your free drills! Book a call with our English Coaching team. We'll identify what's holding you back and give you a clear roadmap to natural fluency.
          </AppText>

          <TouchableOpacity
            style={tw`w-full bg-emerald-600 rounded-full py-4 items-center mb-3`}
            onPress={() => {
              onClose();
              router.push("/book-call");
            }}
            activeOpacity={0.8}
          >
            <AppText style={tw`text-white font-semibold text-base`}>
              Book My Performance Review
            </AppText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`w-full border border-neutral-200 rounded-full py-4 items-center mb-1`}
            onPress={() => {
              onClose();
              router.push("/premium");
            }}
            activeOpacity={0.8}
          >
            <AppText style={tw`text-neutral-700 font-semibold text-base`}>
              Upgrade to Premium
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
