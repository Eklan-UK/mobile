import AIMessage from "@/components/practice/AIMessage";
import MicPermissionModal from "@/components/practice/MicPermissionModal";
import ScenarioHintModal from "@/components/practice/ScenarioHintModal";
import StatusMessage from "@/components/practice/StatusMessage";
import UserMessage from "@/components/practice/UserMessage";
import { AudioStreamPlayer } from "@/lib/audio-stream-player";
import tw from "@/lib/tw";
import { aiService } from "@/services/ai.service";
import { ttsService } from "@/services/tts.service";
import { useAiUsageStore } from "@/store/ai-usage-store";
import { setAudioModeSafely } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

type Message = {
  id: string;
  type: "ai" | "user" | "status";
  text: string;
  statusType?: "listening" | "analyzing";
  showAvatar?: boolean;
};

interface HintData {
  scenarioTitle: string;
  hint: string;
  usefulPhrases: string[];
}

export default function FreeTalkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);
  const streamPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const playingAudioIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "model"; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [micState, setMicState] = useState<"normal" | "recording" | "listening" | "analyzing">("normal");
  const [showTextInput, setShowTextInput] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Active scenario identity — sent with every message so the backend stays anchored
  const [activeScenarioTitle, setActiveScenarioTitle] = useState<string | null>(null);

  // Hint modal state
  const [hintData, setHintData] = useState<HintData | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);

  // Pending next scenario — populated when scenarioComplete === true; consumed on "Yes" tap
  const [pendingNextScenarioTitle, setPendingNextScenarioTitle] = useState<string | null>(null);
  const [pendingNextHint, setPendingNextHint] = useState<string | null>(null);
  const [pendingNextUsefulPhrases, setPendingNextUsefulPhrases] = useState<string[] | null>(null);

  // Yes/No continue modal
  const [showContinueModal, setShowContinueModal] = useState(false);

  const { incrementTurn } = useAiUsageStore();

  // ----- Initialise -----
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      streamPlayerRef.current = new AudioStreamPlayer();
      await streamPlayerRef.current.initialize();
      if (cancelled) return;
      await startScenario();
    };

    void run();

    return () => {
      cancelled = true;
      streamPlayerRef.current?.stop();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    const sub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
    );
    return () => sub.remove();
  }, []);

  // ----- Scenario greeting -----
  const startScenario = async () => {
    setIsInitializing(true);
    setMessages([]);
    setConversationHistory([]);
    setPendingNextScenarioTitle(null);
    setPendingNextHint(null);
    setPendingNextUsefulPhrases(null);

    const greetingId = Date.now().toString();
    setMessages([{ id: greetingId, type: "ai", text: "", showAvatar: true }]);

    try {
      const onChunk = (chunk: { type: "audio" | "text" | "metadata"; data: any }) => {
        if (chunk.type === "text") {
          setMessages(prev =>
            prev.map(m => m.id === greetingId ? { ...m, text: m.text + chunk.data } : m)
          );
        } else if (chunk.type === "audio") {
          streamPlayerRef.current?.addCompressedChunkBase64(chunk.data);
        } else if (chunk.type === "metadata") {
          setConversationHistory(prev => [
            ...prev,
            { role: "model", content: chunk.data.fullText || "" },
          ]);

          if (chunk.data.scenarioTitle) {
            setActiveScenarioTitle(chunk.data.scenarioTitle);
          }

          // Show hint modal after greeting — spec §4
          if (chunk.data.hint || chunk.data.usefulPhrases) {
            setHintData({
              scenarioTitle: chunk.data.scenarioTitle || "Scenario",
              hint: chunk.data.hint || "",
              usefulPhrases: chunk.data.usefulPhrases || [],
            });
            setShowHintModal(true);
          }
        }
      };

      await aiService.streamFreeTalkGreeting(onChunk);
      await streamPlayerRef.current?.flush();
    } catch (error: any) {
      logger.error("Failed to stream free-talk greeting:", error?.message ?? error);
      setMessages([{
        id: greetingId,
        type: "ai",
        text: "Hello! I'm ready to practise with you. Tap the mic to begin.",
        showAvatar: true,
      }]);
    } finally {
      setIsInitializing(false);
    }
  };

  // ----- Send user response -----
  const processStreamResponse = async (
    userMessage: string,
    history: Array<{ role: "user" | "model"; content: string }>,
    scenarioTitle: string | null
  ) => {
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, type: "ai", text: "", showAvatar: true }]);

    try {
      const onChunk = (chunk: { type: "audio" | "text" | "metadata"; data: any }) => {
        if (chunk.type === "text") {
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + chunk.data } : m)
          );
        } else if (chunk.type === "audio") {
          streamPlayerRef.current?.addCompressedChunkBase64(chunk.data);
        } else if (chunk.type === "metadata") {
          setConversationHistory(prev => [
            ...prev,
            { role: "model", content: chunk.data.fullText || "" },
          ]);

          if (chunk.data.scenarioComplete) {
            // Store pending next-scenario data — spec §1
            // The Yes/No modal is shown; hint modal fires only after user taps Yes — spec §4
            const nextTitle = chunk.data.scenarioTitle as string | undefined;
            setPendingNextScenarioTitle(nextTitle ?? null);
            setPendingNextHint(chunk.data.hint ?? null);
            setPendingNextUsefulPhrases(chunk.data.usefulPhrases ?? null);
            setShowContinueModal(true);
          } else if (chunk.data.hint || chunk.data.usefulPhrases) {
            // New scenario intro response (after "Yes" POST) — update active title, spec §2 step 3
            if (chunk.data.scenarioTitle) {
              setActiveScenarioTitle(chunk.data.scenarioTitle);
            }
          }
        }
      };

      await aiService.streamFreeTalkMessage(
        {
          userMessage,
          conversationHistory: history.slice(0, -1),
          activeScenarioTitle: scenarioTitle ?? undefined,
        },
        onChunk
      );
      await streamPlayerRef.current?.flush();
    } catch (error) {
      logger.error("Free-talk stream error:", error);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, text: "Sorry, I had trouble responding. Please try again." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Continue modal handlers — spec §2 & §3 -----
  const handleContinueYes = async () => {
    setShowContinueModal(false);

    // Step 1: show hint modal immediately with stored pending data — spec §2
    if (pendingNextHint || pendingNextUsefulPhrases) {
      setHintData({
        scenarioTitle: pendingNextScenarioTitle || "Next Scenario",
        hint: pendingNextHint || "",
        usefulPhrases: pendingNextUsefulPhrases || [],
      });
      setShowHintModal(true);
    }

    // Step 2: POST with new activeScenarioTitle and empty history — spec §2
    const nextTitle = pendingNextScenarioTitle;
    setActiveScenarioTitle(nextTitle);
    setConversationHistory([]);
    setPendingNextScenarioTitle(null);
    setPendingNextHint(null);
    setPendingNextUsefulPhrases(null);

    incrementTurn();

    const newHistory: Array<{ role: "user" | "model"; content: string }> = [
      { role: "user", content: "Yes, let's continue." },
    ];
    setConversationHistory(newHistory);

    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text: "Yes, let's continue.",
    };
    setMessages(prev => [...prev, userMsg]);

    await processStreamResponse("Yes, let's continue.", newHistory, nextTitle);
  };

  const handleContinueNo = () => {
    setShowContinueModal(false);
    streamPlayerRef.current?.stop();
    router.back();
  };

  // ----- Text message send -----
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const trimmed = text.trim();
    setUserInput("");

    streamPlayerRef.current?.stop();
    if (playingAudioId) {
      await ttsService.stopAudio();
      setPlayingAudioId(null);
      playingAudioIdRef.current = null;
    }

    const userMessage: Message = { id: Date.now().toString(), type: "user", text: trimmed };
    setMessages(prev => [...prev, userMessage]);

    incrementTurn();

    const newHistory: Array<{ role: "user" | "model"; content: string }> = [
      ...conversationHistory,
      { role: "user", content: trimmed },
    ];
    setConversationHistory(newHistory);
    await processStreamResponse(trimmed, newHistory, activeScenarioTitle);
  };

  // ----- Mic -----
  const handleMicPress = async () => {
    if (!hasPermission) { setShowPermissionModal(true); return; }
    if (micState === "normal") await startRecording();
    else if (micState === "recording") await stopRecordingAndProcess();
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") { setShowPermissionModal(true); return; }

      await setAudioModeSafely({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      streamPlayerRef.current?.stop();
      if (playingAudioId) { await ttsService.stopAudio(); setPlayingAudioId(null); playingAudioIdRef.current = null; }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setMicState("recording");
    } catch (err) {
      logger.error("Failed to start recording:", err);
      setMicState("normal");
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recordingRef.current) { setMicState("normal"); return; }

    try {
      setMicState("listening");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error("No recording URI");

      setMicState("analyzing");
      setMessages(prev => [
        ...prev.filter(m => m.statusType !== "listening" && m.statusType !== "analyzing"),
        { id: Date.now().toString(), type: "status", text: "", statusType: "analyzing" },
      ]);

      let transcribed = "";
      try {
        transcribed = await aiService.transcribeAudio(uri, "en");
      } catch (e) {
        logger.warn("Transcription failed, using fallback voice label", e);
      }

      const userText = transcribed ? `🎤 [Voice] ${transcribed}` : "🎤 [Voice message]";
      const userMessage: Message = { id: Date.now().toString(), type: "user", text: userText };
      setMessages(prev => [...prev.filter(m => m.type !== "status"), userMessage]);
      setMicState("normal");

      incrementTurn();

      const newHistory: Array<{ role: "user" | "model"; content: string }> = [
        ...conversationHistory,
        { role: "user", content: transcribed || "[Voice message]" },
      ];
      setConversationHistory(newHistory);
      await processStreamResponse(transcribed || "[Voice message]", newHistory, activeScenarioTitle);
    } catch (err) {
      logger.error("Failed to process recording:", err);
      setMicState("normal");
      setMessages(prev => prev.filter(m => m.type !== "status"));
      setShowTextInput(true);
      inputRef.current?.focus();
    }
  };

  // ----- Permissions -----
  const handlePermissionAllow = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
    } catch (e) {
      logger.error("Permission request failed:", e);
    } finally {
      setShowPermissionModal(false);
    }
  };

  const handlePermissionDeny = () => {
    setShowPermissionModal(false);
    setShowTextInput(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ----- Leave -----
  const handleBack = () => setShowLeaveModal(true);

  const handleLeaveConfirm = () => {
    setShowLeaveModal(false);
    streamPlayerRef.current?.stop();
    router.back();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      ttsService.cleanup().catch(() => {});
    };
  }, []);

  // ----- Render -----
  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
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
            <Text style={tw`text-base font-semibold text-gray-900`}>Eklan Free Talk</Text>
            <View style={tw`w-10`} />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`px-4 py-3`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isInitializing && messages.length === 0 && (
            <View style={tw`py-8 items-center`}>
              <Text style={tw`text-gray-400 text-sm`}>Preparing your scenario…</Text>
            </View>
          )}

          {messages.map(message => {
            if (message.type === "ai") {
              return (
                <AIMessage
                  key={message.id}
                  text={message.text}
                  showAvatar={message.showAvatar}
                  messageId={message.id}
                  isPlaying={playingAudioId === message.id}
                  onPlayAudio={() => {}}
                />
              );
            }
            if (message.type === "user") {
              return <UserMessage key={message.id} text={message.text} />;
            }
            if (message.type === "status" && message.statusType) {
              return <StatusMessage key={message.id} type={message.statusType} />;
            }
            return null;
          })}

          {isLoading && (
            <View style={tw`mb-4`}>
              <StatusMessage type="analyzing" />
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        <View
          style={[
            tw`border-t border-gray-100 bg-white px-4`,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          {showTextInput ? (
            <View style={tw`pt-3 pb-2`}>
              <View style={tw`flex-row items-center gap-2`}>
                <TextInput
                  ref={inputRef}
                  style={tw`flex-1 bg-gray-50 rounded-full px-4 py-3 text-base border border-gray-200`}
                  placeholder="Type your response…"
                  placeholderTextColor="#9CA3AF"
                  value={userInput}
                  onChangeText={setUserInput}
                  onSubmitEditing={() => { sendMessage(userInput); setShowTextInput(false); }}
                  returnKeyType="send"
                  multiline={false}
                  editable={!isLoading}
                  onFocus={() =>
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300)
                  }
                />
                <TouchableOpacity
                  onPress={() => { sendMessage(userInput); setShowTextInput(false); }}
                  style={tw`bg-[#2a602c] rounded-full p-3`}
                  disabled={!userInput.trim() || isLoading}
                >
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowTextInput(false); setUserInput(""); }}
                  style={tw`w-10 h-10 items-center justify-center`}
                >
                  <Ionicons name="mic" size={28} color="#2a602c" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={tw`pt-2 pb-1`}>
              <View style={tw`flex-row items-center justify-between`}>
                {/* Keyboard toggle */}
                <TouchableOpacity
                  onPress={() => {
                    setShowTextInput(true);
                    setTimeout(() => {
                      inputRef.current?.focus();
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
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

                {/* Mic button */}
                <TouchableOpacity
                  onPress={handleMicPress}
                  disabled={isLoading || isInitializing}
                  activeOpacity={0.8}
                  style={[
                    tw`w-20 h-20 rounded-full items-center justify-center`,
                    {
                      backgroundColor:
                        micState === "recording"
                          ? "#EF4444"
                          : isLoading || isInitializing
                          ? "#D1D5DB"
                          : "#2a602c",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}
                >
                  <Ionicons
                    name={micState === "recording" ? "stop" : "mic"}
                    size={40}
                    color="white"
                  />
                </TouchableOpacity>

                <View style={tw`w-12 h-12`} />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Hint modal — shown after greeting AND after user taps Yes (spec §4) */}
      {hintData && (
        <ScenarioHintModal
          visible={showHintModal}
          scenarioTitle={hintData.scenarioTitle}
          hint={hintData.hint}
          usefulPhrases={hintData.usefulPhrases}
          onDismiss={() => setShowHintModal(false)}
        />
      )}

      {/* Yes/No continue modal — shown when scenarioComplete === true (spec §1) */}
      <Modal
        visible={showContinueModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContinueModal(false)}
      >
        <View style={tw`flex-1 bg-black/50 items-center justify-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm`}>
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-16 h-16 rounded-full bg-[#f0fdf4] items-center justify-center`}>
                <Ionicons name="checkmark-circle" size={36} color="#2a602c" />
              </View>
            </View>
            <Text style={tw`text-xl font-bold text-center text-gray-900 mb-2`}>
              Great work!
            </Text>
            <Text style={tw`text-sm text-center text-gray-500 mb-6`}>
              Would you like to continue with another scenario?
            </Text>
            <View style={tw`gap-3`}>
              <TouchableOpacity
                onPress={handleContinueYes}
                style={tw`bg-[#2a602c] rounded-full py-4`}
              >
                <Text style={tw`text-center text-white font-semibold text-base`}>Yes, continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleContinueNo}
                style={tw`border-2 border-[#2a602c] rounded-full py-4`}
              >
                <Text style={tw`text-center text-[#2a602c] font-semibold text-base`}>No, I'm done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave confirmation */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={tw`flex-1 bg-black/50 items-center justify-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm`}>
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-16 h-16 rounded-full bg-gray-100 items-center justify-center`}>
                <Ionicons name="information-circle-outline" size={32} color="#2a602c" />
              </View>
            </View>
            <Text style={tw`text-xl font-bold text-center text-gray-900 mb-2`}>
              Leave this session?
            </Text>
            <Text style={tw`text-sm text-center text-gray-500 mb-6`}>
              Your progress won't be saved. You'll start a fresh scenario next time.
            </Text>
            <View style={tw`gap-3`}>
              <TouchableOpacity
                onPress={handleLeaveConfirm}
                style={tw`border-2 border-[#2a602c] rounded-full py-4`}
              >
                <Text style={tw`text-center text-[#2a602c] font-semibold text-base`}>Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowLeaveModal(false)}
                style={tw`bg-[#2a602c] rounded-full py-4`}
              >
                <Text style={tw`text-center text-white font-semibold text-base`}>Keep going</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mic permission */}
      <MicPermissionModal
        visible={showPermissionModal}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />
    </SafeAreaView>
  );
}
