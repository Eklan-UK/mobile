import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { aiService } from '@/services/ai.service';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/utils/logger';

interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
}

interface VoiceConversationProps {
  onResponse?: (response: string) => void;
  context?: string;
  initialHistory?: ConversationMessage[];
}

export function VoiceConversation({
  onResponse,
  context,
  initialHistory = [],
}: VoiceConversationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>(initialHistory);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const {
    isRecording,
    audioUri,
    startRecording,
    stopRecording,
    error,
  } = useAudioRecording({
    onRecordingComplete: async (uri) => {
      if (!uri) return;

      setIsProcessing(true);
      try {
        const response = await aiService.sendVoiceMessage(
          uri,
          conversationHistory,
          context
        );

        setLastResponse(response);
        const newHistory: ConversationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: '[Voice message]' },
          { role: 'model', content: response },
        ];
        setConversationHistory(newHistory);
        onResponse?.(response);
      } catch (err: any) {
        logger.error('Error processing voice message:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    onError: (err) => {
      logger.error('Recording error:', err);
    },
  });

  const handlePress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <View style={tw`items-center gap-4`}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isProcessing}
        style={tw`w-20 h-20 rounded-full ${
          isRecording ? 'bg-red-600' : 'bg-green-600'
        } items-center justify-center shadow-lg ${isProcessing ? 'opacity-50' : ''}`}
        activeOpacity={0.8}
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color="white" />
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={36}
            color="white"
          />
        )}
      </TouchableOpacity>

      {isRecording && (
        <AppText style={tw`text-sm text-gray-600`}>
          Recording... Tap to stop
        </AppText>
      )}

      {isProcessing && (
        <AppText style={tw`text-sm text-gray-600`}>
          Processing audio with AI...
        </AppText>
      )}

      {error && (
        <AppText style={tw`text-sm text-red-600`}>
          {error.message}
        </AppText>
      )}

      {lastResponse && (
        <View style={tw`bg-gray-100 rounded-lg p-4 mt-4 max-w-full`}>
          <BoldText style={tw`text-sm mb-2`}>AI Response:</BoldText>
          <AppText style={tw`text-sm text-gray-700`}>{lastResponse}</AppText>
        </View>
      )}
    </View>
  );
}

