import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";

interface StatusMessageProps {
  type: "listening" | "analyzing" | "tap-to-record";
}

export default function StatusMessage({ type }: StatusMessageProps) {
  const getText = () => {
    switch (type) {
      case "listening":
        return "Listening...";
      case "analyzing":
        return "Processing with AI...";
      case "tap-to-record":
        return "Tap to record";
      default:
        return "";
    }
  };

  return (
    <View style={tw`flex-row items-start justify-end mb-4 px-5`}>
      {/* AI Coach Avatar */}
      <View style={tw`w-12 h-12 rounded-full items-center justify-center mr-3`}>
        <AppText style={tw`text-3xl`}>🤖</AppText>
      </View>
      
      {/* Status Bubble */}
      <View style={tw`bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm`}>
        <View style={tw`flex-row items-center gap-2`}>
          <AppText style={tw`text-gray-700 text-base`}>
            {getText()}
          </AppText>
          {type !== "tap-to-record" && (
            <Ionicons name="mic" size={16} color="#6B7280" />
          )}
        </View>
      </View>
    </View>
  );
}
