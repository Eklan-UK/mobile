import tw from "@/lib/tw";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTTS } from "@/hooks/useTTS";
import { useState } from "react";
import { logger } from "@/utils/logger";

interface AudioButtonProps {
  text?: string;
  audioUri?: string;
  onPress?: () => void;
  size?: number;
  voiceId?: string;
}

export default function AudioButton({ 
  text, 
  audioUri, 
  onPress, 
  size = 20,
  voiceId 
}: AudioButtonProps) {
  const { playAudio, isGenerating, isPlaying, stopAudio } = useTTS({
    autoPlay: true,
  });
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    if (isLocalPlaying) {
      await stopAudio();
      setIsLocalPlaying(false);
    } else {
        if (audioUri) {
          // Play from URI directly using expo-av
          // Note: expo-av needs to be installed: npx expo install expo-av
          try {
            const { Audio } = await import('expo-av');
            const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
            setIsLocalPlaying(true);
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                setIsLocalPlaying(false);
                sound.unloadAsync();
              }
            });
          } catch (error) {
            logger.error('Error playing audio:', error);
            // Fallback to TTS if audio URI fails
            if (text) {
              setIsLocalPlaying(true);
              await playAudio(text, voiceId);
              setIsLocalPlaying(false);
            }
          }
        } else if (text) {
        // Generate and play TTS
        setIsLocalPlaying(true);
        await playAudio(text, voiceId);
        setIsLocalPlaying(false);
      }
    }
  };

  const isLoading = isGenerating || isLocalPlaying;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={tw`w-6 h-6 items-center justify-center`}
      activeOpacity={0.6}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#6B7280" />
      ) : (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M11 5L6 9H2v6h4l5 4V5z"
            fill={isPlaying ? "#10B981" : "#6B7280"}
        />
        <Path
          d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73"
            stroke={isPlaying ? "#10B981" : "#6B7280"}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
      )}
    </TouchableOpacity>
  );
}
