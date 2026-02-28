import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import React from "react";
import { Modal, TouchableOpacity, View } from "react-native";

interface MicPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function MicPermissionModal({
  visible,
  onAllow,
  onDeny,
}: MicPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDeny}
    >
      <View style={tw`flex-1 bg-black/50 items-center justify-center px-5`}>
        <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm`}>
          {/* Icon */}
          <View style={tw`items-center mb-4`}>
            <View style={tw`relative`}>
              <AppText style={tw`text-5xl`}>🎤</AppText>
              <AppText style={tw`text-2xl absolute -top-2 -right-2`}>✨</AppText>
            </View>
          </View>

          {/* Title */}
          <AppText style={tw`text-xl font-bold text-gray-900 text-center mb-6`}>
            Allow Eklan to record audio
          </AppText>

          {/* Buttons */}
          <View style={tw`gap-3`}>
            <TouchableOpacity
              onPress={onAllow}
              style={tw`bg-blue-600 rounded-full py-4 items-center`}
            >
              <AppText style={tw`text-white font-semibold text-base`}>
                WHILE USING THE APP
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAllow}
              style={tw`bg-gray-400 rounded-full py-4 items-center`}
            >
              <AppText style={tw`text-white font-semibold text-base`}>
                ONLY THIS TIME
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDeny}
              style={tw`bg-gray-400 rounded-full py-4 items-center`}
            >
              <AppText style={tw`text-white font-semibold text-base`}>
                DON'T ALLOW
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
