import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { useEffect, useRef, useState } from "react";
import { Animated, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import MicO from "@/assets/icons/mic.svg";
import StopIcon from "@/assets/icons/stop.svg";
import SendIcon from '@/assets/icons/send.svg'
interface RecordButtonProps {
  onPress: () => void;
  isRecording?: boolean;
  isListening?: boolean;
  hasRecording?: boolean;
}



export default function RecordButton({
  onPress,
  isRecording = false,
  isListening = false,
  hasRecording = false
}: RecordButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const getButtonColor = () => {
    if (isListening) return "bg-green-600";
    if (hasRecording) return "bg-green-700";
    if (isRecording) return "bg-green-700";
    return "bg-green-700";
  };

  const getButtonIcon = () => {
    if (isRecording) {
      return <StopIcon width={40} height={40} color="white" />;
    }
    if (hasRecording) {
      return <SendIcon width={40} height={40} color="white" />;
    }
    return <MicO width={40} height={40} />;
  };

  return (
    <View style={tw`items-center`}>
      <Animated.View
        style={[
          isRecording ? { transform: [{ scale: pulseAnim }] } : {}
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          disabled={isListening}
          style={tw`w-[88px] h-[88px] rounded-full ${getButtonColor()} items-center justify-center shadow-xl`}
          activeOpacity={0.8}
        >
          {getButtonIcon()}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}