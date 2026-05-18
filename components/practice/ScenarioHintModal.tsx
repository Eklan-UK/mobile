import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, TouchableOpacity, View } from "react-native";

interface ScenarioHintModalProps {
  visible: boolean;
  scenarioTitle: string;
  hint: string;
  usefulPhrases: string[];
  onDismiss: () => void;
}

export default function ScenarioHintModal({
  visible,
  scenarioTitle,
  hint,
  usefulPhrases,
  onDismiss,
}: ScenarioHintModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={tw`flex-1 justify-end bg-black/40`}>
        <TouchableOpacity
          style={tw`flex-1`}
          activeOpacity={1}
          onPress={onDismiss}
        />
        <View style={tw`bg-white rounded-t-3xl px-6 pt-5 pb-8`}>
          {/* Drag handle */}
          <View style={tw`w-10 h-1 bg-gray-200 rounded-full self-center mb-5`} />

          {/* Scenario label */}
          <View style={tw`flex-row items-center gap-2 mb-4`}>
            <View style={tw`w-6 h-6 rounded-full bg-[#2a602c] items-center justify-center`}>
              <Ionicons name="bulb" size={13} color="#FBD100" />
            </View>
            <AppText style={tw`text-xs font-semibold text-[#2a602c] uppercase tracking-wider`}>
              {scenarioTitle}
            </AppText>
          </View>

          {/* Your Response */}
          <BoldText style={tw`text-sm font-bold text-[#101828] mb-1`}>
            Your Response
          </BoldText>
          <AppText style={tw`text-sm text-[#555] mb-4 leading-relaxed`}>
            {hint}
          </AppText>

          {/* Useful Phrases */}
          {usefulPhrases.length > 0 && (
            <View style={tw`mb-6`}>
              <BoldText style={tw`text-sm font-bold text-[#101828] mb-2`}>
                Useful Phrases
              </BoldText>
              <View style={tw`gap-2`}>
                {usefulPhrases.map((phrase, i) => (
                  <View key={i} style={tw`flex-row items-start gap-2`}>
                    <View style={tw`w-1.5 h-1.5 rounded-full bg-[#2a602c] mt-1.5 flex-shrink-0`} />
                    <AppText style={tw`text-sm text-[#444] flex-1`}>{phrase}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Got it button */}
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.85}
            style={tw`bg-[#2a602c] rounded-full py-4 items-center`}
          >
            <BoldText style={tw`text-white text-base font-bold`}>Got it, I'm ready</BoldText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
