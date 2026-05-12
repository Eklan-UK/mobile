import tw from "@/lib/tw";
import { ttsService } from "@/services/tts.service";
import { setAudioModeSafely } from "@/utils/audio";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTTS } from "@/hooks/useTTS";
import { useState } from "react";
import { Audio } from "expo-av";
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
  voiceId,
}: AudioButtonProps) {
  const { playAudio, isGenerating, isPlaying, stopAudio } = useTTS({
    autoPlay: true,
  });
  // Tracks playback state for direct-URI mode (expo-av outside TTS hook)
  const [isUriPlaying, setIsUriPlaying] = useState(false);

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    const currentlyActive = isGenerating || isPlaying || isUriPlaying;

    // Stop everything first, regardless of path
    await ttsService.stopAudio();
    setIsUriPlaying(false);
    await stopAudio();

    if (currentlyActive) {
      // We were playing — stopping is the action, nothing more to do
      return;
    }

    // Set audio mode for playback (resets recording mode on iOS)
    try {
      await setAudioModeSafely({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) {
      logger.warn("AudioButton: could not set audio mode:", e);
    }

    if (audioUri) {
      // Play from pre-generated URI via expo-av directly
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
        setIsUriPlaying(true);
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsUriPlaying(false);
            sound.unloadAsync().catch(() => {});
          }
        });
      } catch (error) {
        logger.error("AudioButton: error playing URI:", error);
        setIsUriPlaying(false);
        // Fall back to TTS if URI fails
        if (text) {
          await playAudio(text, voiceId);
        }
      }
    } else if (text) {
      // Generate and play TTS
      await playAudio(text, voiceId);
    }
  };

  const isActive = isGenerating || isPlaying || isUriPlaying;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={tw`w-6 h-6 items-center justify-center`}
      activeOpacity={0.6}
    >
      {isGenerating ? (
        <ActivityIndicator size="small" color="#6B7280" />
      ) : (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M11 5L6 9H2v6h4l5 4V5z"
            fill={isActive ? "#10B981" : "#6B7280"}
          />
          <Path
            d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73"
            stroke={isActive ? "#10B981" : "#6B7280"}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      )}
    </TouchableOpacity>
  );
}
