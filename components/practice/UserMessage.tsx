import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/store/auth-store";

interface UserMessageProps {
  text: string;
  showAvatar?: boolean;
}

export default function UserMessage({ text, showAvatar = true }: UserMessageProps) {
  const { user } = useAuthStore();
  
  return (
    <View style={tw`flex-row items-start justify-end mb-4 px-5`}>
      {/* Message Bubble */}
      <View style={tw`max-w-[85%] ${!showAvatar ? 'mr-0' : 'mr-3'}`}>
        <View style={tw`bg-green-600 rounded-2xl rounded-tr-sm px-4 py-3`}>
          <AppText style={tw`text-white text-base leading-6`}>
            {text}
          </AppText>
        </View>
        
        {/* Audio Controls */}
        <View style={tw`flex-row items-center justify-end mt-2 gap-3`}>
          <TouchableOpacity>
            <Ionicons name="volume-high" size={18} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="reload" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Avatar */}
      {showAvatar && (
        <View style={tw`w-10 h-10 rounded-full bg-green-600 items-center justify-center overflow-hidden`}>
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={tw`w-full h-full rounded-full`}
              resizeMode="cover"
            />
          ) : (
            <AppText style={tw`text-xl`}>👤</AppText>
          )}
        </View>
      )}
    </View>
  );
}
