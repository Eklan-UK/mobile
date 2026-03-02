import AIMessage from "@/components/practice/AIMessage";
import MicPermissionModal from "@/components/practice/MicPermissionModal";
import SpeakingSelectionBottomSheet from "@/components/practice/SpeakingSelectionBottomSheet";
import StatusMessage from "@/components/practice/StatusMessage";
import UserMessage from "@/components/practice/UserMessage";
import tw from "@/lib/tw";
import { aiService } from "@/services/ai.service";
import { ttsService } from "@/services/tts.service";
import { logger } from "@/utils/logger";
import { setAudioModeSafely } from "@/utils/audio";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AudioStreamPlayer } from "@/lib/audio-stream-player";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAiUsageStore } from "@/store/ai-usage-store";

type Message = {
  id: string;
  type: "ai" | "user" | "status";
  text: string;
  statusType?: "listening" | "analyzing" | "tap-to-record";
  showAvatar?: boolean;
  audioUri?: string; // For TTS audio
};

export default function AiTalkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const topic = params.topic as string || "daily-life";
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const playingAudioIdRef = useRef<string | null>(null);

  // Conversation history for AI
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "model"; content: string }>>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [micState, setMicState] = useState<"normal" | "recording" | "listening" | "analyzing">("normal");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showSpeakingSheet, setShowSpeakingSheet] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [autoPlayedMessages, setAutoPlayedMessages] = useState<Set<string>>(new Set());

  const { incrementTurn } = useAiUsageStore();

  // SSE Stream Player Reference
  const streamPlayerRef = useRef<AudioStreamPlayer | null>(null);

  // Initialize conversation with greeting
  useEffect(() => {
    // Setup AudioStreamPlayer
    streamPlayerRef.current = new AudioStreamPlayer();
    streamPlayerRef.current.initialize();

    initializeConversation();

    return () => {
      // Cleanup player
      streamPlayerRef.current?.stop();
    };
  }, [topic, params.drillId]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    // Handle keyboard show/hide
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  // Auto-play TTS fallback messages when audioUri is available (legacy logic, usually bypassed by SSE)
  useEffect(() => {
    const aiMessages = messages.filter(m => m.type === "ai" && m.audioUri);

    // Find the most recent AI message with audio that hasn't been auto-played
    const latestMessage = aiMessages[aiMessages.length - 1];

    if (latestMessage && latestMessage.audioUri && !autoPlayedMessages.has(latestMessage.id)) {
      // Small delay to ensure audio is ready
      const timeoutId = setTimeout(async () => {
        // Check again if still not playing using ref to avoid stale closure
        if (!playingAudioIdRef.current && latestMessage.audioUri) {
          try {
            // Play new audio using the existing handler
            await handlePlayAudio(latestMessage.id, latestMessage.audioUri);
            setAutoPlayedMessages(prev => new Set([...prev, latestMessage.id]));
          } catch (error) {
            logger.error("Failed to auto-play audio:", error);
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  const initializeConversation = async () => {
    setIsInitializing(true);
    setMessages([]);
    setConversationHistory([]);
    try {
      const isDrill = !!params.drillId;
      const drillId = params.drillId as string;
      const topicId = topic as string;

      // Add a placeholder message for the AI that will catch streamed text
      const greetingId = Date.now().toString();
      const aiGreetingMessage: Message = {
        id: greetingId,
        type: "ai",
        text: "",
        showAvatar: true,
      };
      setMessages([aiGreetingMessage]);

      const onChunk = (chunk: { type: 'audio'|'text'|'metadata', data: any }) => {
        if (chunk.type === 'text') {
          // Accumulate text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === greetingId ? { ...msg, text: msg.text + chunk.data } : msg
            )
          );
        } else if (chunk.type === 'audio') {
           // Queue the base64 WAV chunk for gapless playback
           streamPlayerRef.current?.addCompressedChunkBase64(chunk.data);
        } else if (chunk.type === 'metadata') {
           // Add to conversation history when complete
           setConversationHistory((prev) => [
              ...prev,
              { role: "model", content: chunk.data.fullText || "" }
           ]);
        }
      };

      if (isDrill) {
         await aiService.streamDrillPracticeGreeting(drillId, onChunk);
      } else {
         await aiService.streamTopicPracticeGreeting(topicId, onChunk);
      }
      // Flush any remaining PCM bytes that didn't reach the 400ms threshold
      await streamPlayerRef.current?.flush();

    } catch (error) {
      logger.error("Failed to initialize conversation stream:", error);
      // Fallback greeting
      setMessages([{
        id: Date.now().toString(),
        type: "ai",
        text: "Hello! I'm Eklan, your AI English tutor. I'm here to practice with you. Just tap the microphone to speak!",
        showAvatar: true,
      }]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleBack = () => {
    // Show leave confirmation modal
    setShowLeaveModal(true);
  };

  const handleLeaveConfirm = () => {
    setShowLeaveModal(false);
    streamPlayerRef.current?.stop();
    router.back();
  };

  const handleLeaveCancel = () => {
    setShowLeaveModal(false);
  };

  const handleMicPress = async () => {
    if (!hasPermission) {
      setShowPermissionModal(true);
      return;
    }

    if (micState === "normal") {
      // Start recording
      await startRecording();
    } else if (micState === "recording") {
      // Stop recording and process
      await stopRecordingAndProcess();
    }
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setShowPermissionModal(true);
        return;
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Stop any AI audio currently playing
      streamPlayerRef.current?.stop();
      if (playingAudioId) {
         await ttsService.stopAudio();
         setPlayingAudioId(null);
         playingAudioIdRef.current = null;
      }

      logger.log("Starting recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setMicState("recording");
    } catch (error) {
      logger.error("Failed to start recording:", error);
      setMicState("normal");
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recordingRef.current) {
      setMicState("normal");
      return;
    }

    try {
      setMicState("listening");

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording URI");
      }

      setMicState("analyzing");
      setMessages(prev => {
        const filtered = prev.filter(m => m.statusType !== "listening" && m.statusType !== "analyzing");
        return [...filtered, {
          id: Date.now().toString(),
          type: "status",
          text: "",
          statusType: "analyzing",
        }];
      });

      // First transcibe the audio.
      let transcribedText = "";
      try {
        transcribedText = await aiService.transcribeAudio(uri, "en");
      } catch (e) {
         logger.warn('Transcription failed. Falling back to native SSE stream bypass (not sending text).', e);
      }

      // Add user voice message indicator + transcription if available
      const userMessageText = transcribedText ? `🎤 [Voice] ${transcribedText}` : "🎤 [Voice message]";
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        text: userMessageText,
      };

      setMessages(prev => [...prev.filter(m => m.type !== "status"), userMessage]);
      setMicState("normal");

      // Count this as a free-talk turn
      incrementTurn();

      // Update local conversation context with transcription so AI remembers it
      const updatedHistory: Array<{ role: "user" | "model"; content: string }> = [
        ...conversationHistory,
        { role: "user", content: transcribedText || "[Voice message]" },
      ];
      setConversationHistory(updatedHistory);

      // Now stream response
      await processStreamResponse(transcribedText || "[Voice message]", updatedHistory);

    } catch (error) {
      logger.error("Failed to process recording:", error);
      setMicState("normal");
      setMessages(prev => prev.filter(m => m.type !== "status"));
      // Fallback to text input
      setShowTextInput(true);
      inputRef.current?.focus();
    }
  };


  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessageText = text.trim();
    setUserInput("");
    setIsLoading(true);

    // Stop currently playing audio
    streamPlayerRef.current?.stop();
    if (playingAudioId) {
      await ttsService.stopAudio();
      setPlayingAudioId(null);
      playingAudioIdRef.current = null;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: userMessageText,
    };
    setMessages(prev => [...prev, userMessage]);

    // Count this as a free-talk turn
    incrementTurn();

    // Update conversation history
    const newHistory: Array<{ role: "user" | "model"; content: string }> = [
      ...conversationHistory,
      { role: "user", content: userMessageText },
    ];
    setConversationHistory(newHistory);

    await processStreamResponse(userMessageText, newHistory);
  };

  /**
   * Helper function to process response streams for both Text & Voice
   */
  const processStreamResponse = async (userMessage: string, history: Array<{ role: "user" | "model"; content: string }>) => {
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      type: "ai",
      text: "",
      showAvatar: true,
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      const isDrill = !!params.drillId;
      const drillId = params.drillId as string;
      const topicId = topic as string;

      const payload = {
         userMessage,
         conversationHistory: history.slice(0, -1), // Everything except the recent message
      };

      const onChunk = (chunk: { type: 'audio'|'text'|'metadata', data: any }) => {
        if (chunk.type === 'text') {
          // Accumulate text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: msg.text + chunk.data } : msg
            )
          );
        } else if (chunk.type === 'audio') {
           // Queue audio
           streamPlayerRef.current?.addCompressedChunkBase64(chunk.data);
        } else if (chunk.type === 'metadata') {
           // Update full history
           setConversationHistory((prev) => [
              ...prev.filter(m => m.content !== aiMessage.text), // ensure we don't duplicate
              { role: "model", content: chunk.data.fullText || "" }
           ]);
        }
      };

      if (isDrill) {
         await aiService.streamDrillPracticeMessage({ drillId, ...payload }, onChunk);
      } else {
         await aiService.streamTopicPracticeMessage({ topic: topicId, ...payload }, onChunk);
      }
      // Flush any remaining PCM bytes that didn't reach the 400ms threshold
      await streamPlayerRef.current?.flush();

    } catch (error: any) {
      logger.error("❌ Failed stream logic:", error);
      // Add error message to the unfinished placeholder
      setMessages(prev => prev.map((msg) => 
        msg.id === aiMessageId 
          ? { ...msg, text: "Sorry, I'm having trouble responding right now. Please try again." } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextInputSubmit = () => {
    if (userInput.trim()) {
      sendMessage(userInput);
      setShowTextInput(false);
    }
  };

  const handlePlayAudio = async (messageId: string, audioUri?: string) => {
    if (!audioUri) return;

    try {
      // Stop any currently playing audio
      if (playingAudioId) {
        await ttsService.stopAudio();
        setPlayingAudioId(null);
        playingAudioIdRef.current = null;
      }

      // Play new audio with onFinish callback — no polling needed
      await ttsService.playAudio(audioUri, () => {
        // Called by expo-av's status callback when playback finishes
        if (playingAudioIdRef.current === messageId) {
          setPlayingAudioId(null);
          playingAudioIdRef.current = null;
        }
      });
      setPlayingAudioId(messageId);
      playingAudioIdRef.current = messageId;
    } catch (error) {
      logger.error("Failed to play audio:", error);
      // Reset on error
      if (playingAudioIdRef.current === messageId) {
        setPlayingAudioId(null);
        playingAudioIdRef.current = null;
      }
    }
  };

  const handlePermissionAllow = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
      setShowPermissionModal(false);
    } catch (error) {
      logger.error("Failed to request permissions:", error);
      setShowPermissionModal(false);
    }
  };

  const handlePermissionDeny = () => {
    setShowPermissionModal(false);
    // Fallback to text input
    setShowTextInput(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => { });
      }
      ttsService.cleanup().catch(() => { });
    };
  }, []);

  const handleTalkToCoach = () => {
    setShowSpeakingSheet(false);
    // Navigate to coach screen (not implemented yet)
  };

  const handleKeepPracticing = () => {
    setShowSpeakingSheet(false);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? -20 : -insets.bottom}
      >
        {/* Header */}
        <View style={tw`px-4 py-3 border-b border-gray-100`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity
              onPress={handleBack}
              style={tw`w-10 h-10 items-center justify-center -ml-2`}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={tw`text-lg font-medium text-gray-900`}>
              Eklan chat
            </Text>
            <View style={tw`w-10`} />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`px-4 py-2`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isInitializing && messages.length === 0 && (
            <View style={tw`py-8 items-center`}>
              <Text style={tw`text-gray-500`}>Starting conversation...</Text>
            </View>
          )}
          {messages.map((message) => {
            if (message.type === "ai") {
              return (
                <AIMessage
                  key={message.id}
                  text={message.text}
                  showAvatar={message.showAvatar}
                  audioUri={message.audioUri}
                  messageId={message.id}
                  isPlaying={playingAudioId === message.id}
                  onPlayAudio={handlePlayAudio}
                />
              );
            } else if (message.type === "user") {
              return <UserMessage key={message.id} text={message.text} />;
            } else if (message.type === "status" && message.statusType) {
              return (
                <StatusMessage key={message.id} type={message.statusType} />
              );
            }
            return null;
          })}
          {isLoading && (
            <View style={tw`mb-4`}>
              <StatusMessage type="analyzing" />
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[tw`border-t border-gray-100 bg-white px-4`, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {showTextInput ? (
            // Text Input Mode
            <View style={tw`pt-3 pb-2`}>
              <View style={tw`flex-row items-center gap-2`}>
                <TextInput
                  ref={inputRef}
                  style={tw`flex-1 bg-gray-50 rounded-full px-4 py-3 text-base border border-gray-200`}
                  placeholder="Type your message..."
                  placeholderTextColor="#9CA3AF"
                  value={userInput}
                  onChangeText={setUserInput}
                  onSubmitEditing={handleTextInputSubmit}
                  returnKeyType="send"
                  multiline={false}
                  editable={!isLoading}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
                <TouchableOpacity
                  onPress={handleTextInputSubmit}
                  style={tw`bg-green-600 rounded-full p-3`}
                  disabled={!userInput.trim() || isLoading}
                >
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowTextInput(false);
                    setUserInput("");
                  }}
                  style={tw`w-10 h-10 items-center justify-center`}
                >
                  <Ionicons name="mic" size={28} color="#16A34A" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Microphone Mode
            <View style={tw`pt-2 pb-1`}>
              <View style={tw`flex-row items-center justify-between`}>
                {/* Keyboard Toggle */}
                <TouchableOpacity
                  onPress={() => {
                    setShowTextInput(true);
                    setTimeout(() => {
                      inputRef.current?.focus();
                      // Scroll to bottom when keyboard appears
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 300);
                    }, 100);
                  }}
                  style={tw`w-12 h-12 items-center justify-center`}
                  disabled={isLoading || isInitializing}
                >
                  <Ionicons
                    name="keypad-outline"
                    size={28}
                    color={isLoading || isInitializing ? "#D1D5DB" : "#374151"}
                  />
                </TouchableOpacity>

                {/* Microphone Button */}
                <TouchableOpacity
                  onPress={handleMicPress}
                  disabled={isLoading || isInitializing}
                  style={tw`w-20 h-20 rounded-full ${micState === "recording"
                    ? "bg-red-500"
                    : isLoading || isInitializing
                      ? "bg-gray-300"
                      : "bg-green-600"
                    } items-center justify-center shadow-lg`}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={micState === "recording" ? "stop" : "mic"}
                    size={40}
                    color="white"
                  />
                </TouchableOpacity>

                {/* Empty space for symmetry */}
                <View style={tw`w-12 h-12`} />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Leave Confirmation Modal */}
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={tw`flex-1 bg-black/50 items-center justify-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm`}>
            {/* Icon */}
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-16 h-16 rounded-full bg-gray-100 items-center justify-center`}>
                <Ionicons name="information-circle-outline" size={32} color="#16A34A" />
              </View>
            </View>

            {/* Title */}
            <Text style={tw`text-2xl font-bold text-center text-gray-900 mb-3`}>
              Are you sure you want to leave?
            </Text>

            {/* Description */}
            <Text style={tw`text-base text-center text-gray-500 mb-6`}>
              Assigned to help you feel more confident speaking in work situations.
            </Text>

            {/* Buttons */}
            <View style={tw`gap-3`}>
              <TouchableOpacity
                onPress={handleLeaveConfirm}
                style={tw`bg-white border-2 border-green-600 rounded-full py-4`}
              >
                <Text style={tw`text-center text-green-600 font-semibold text-base`}>
                  Leave
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLeaveCancel}
                style={tw`bg-green-600 rounded-full py-4`}
              >
                <Text style={tw`text-center text-white font-semibold text-base`}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mic Permission Modal */}
      <MicPermissionModal
        visible={showPermissionModal}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />

      {/* Speaking Selection Bottom Sheet */}
      {showSpeakingSheet && (
        <View style={tw`absolute inset-0 bg-black/30`}>
          <TouchableOpacity
            style={tw`flex-1`}
            activeOpacity={1}
            onPress={() => setShowSpeakingSheet(false)}
          />
          <SpeakingSelectionBottomSheet
            onTalkToCoach={handleTalkToCoach}
            onKeepPracticing={handleKeepPracticing}
          />
        </View>
      )}
    </SafeAreaView>
  );
}