import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Logo from "@/assets/icons/logo.svg";
import { TouchableOpacity, View, Text } from "react-native";

interface AIMessageProps {
  text: string;
  showAvatar?: boolean;
  audioUri?: string;
  messageId?: string;
  isPlaying?: boolean;
  onPlayAudio?: (messageId: string, audioUri?: string) => void;
}

export default function AIMessage({
  text,
  showAvatar = true,
  audioUri,
  messageId,
  isPlaying = false,
  onPlayAudio
}: AIMessageProps) {
  const handlePlayPress = () => {
    if (onPlayAudio && messageId && audioUri) {
      onPlayAudio(messageId, audioUri);
    }
  };

  return (
    <View style={tw`flex-row items-start mb-4`}>
      {/* Avatar */}
      {showAvatar && (
        <View style={tw`w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3`}>
          <Logo width={40} height={40} />
        </View>
      )}

      {/* Message Bubble */}
      <View style={tw`flex-1 ${!showAvatar ? 'ml-13' : ''}`}>
        <View style={tw`bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]`}>
          <AppText style={tw`text-gray-900 text-base leading-6`}>
            {text}
          </AppText>
        </View>

        {/* Audio Controls */}
        {audioUri && onPlayAudio && messageId && (
          <View style={tw`flex-row items-center mt-2 gap-3`}>
            <TouchableOpacity
              onPress={handlePlayPress}
              style={tw`flex-row items-center gap-2`}
            >
              <Ionicons
                name={isPlaying ? "volume-high" : "reload"}
                size={18}
                color={isPlaying ? "#16A34A" : "#6B7280"}
              />
              <Text style={tw`text-sm ${isPlaying ? 'text-green-600' : 'text-gray-500'}`}>
                {isPlaying ? "Playing..." : "Replay"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
