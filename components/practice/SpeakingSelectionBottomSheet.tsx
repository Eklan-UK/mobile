import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface SpeakingSelectionBottomSheetProps {
  onTalkToCoach: () => void;
  onKeepPracticing: () => void;
}

export default function SpeakingSelectionBottomSheet({
  onTalkToCoach,
  onKeepPracticing,
}: SpeakingSelectionBottomSheetProps) {
  return (
    <View style={tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl`}>
      {/* Title */}
      <AppText style={tw`text-xl font-bold text-gray-900 mb-2`}>
        This practice works best with a coach
      </AppText>

      {/* Description */}
      <AppText style={tw`text-gray-600 text-base mb-6 leading-6`}>
        This exercise is designed using patterns a human coach listens for things AI can't fully catch yet.
      </AppText>

      {/* Buttons */}
      <View style={tw`gap-3`}>
        <TouchableOpacity
          onPress={onTalkToCoach}
          style={tw`bg-green-600 rounded-full py-4 items-center`}
        >
          <AppText style={tw`text-white font-semibold text-base`}>
            Talk to a coach
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onKeepPracticing}
          style={tw`bg-white border border-gray-300 rounded-full py-4 items-center`}
        >
          <AppText style={tw`text-gray-700 font-semibold text-base`}>
            Keep practicing with AI
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
